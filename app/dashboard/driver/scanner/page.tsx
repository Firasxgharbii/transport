"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Keyboard,
  Loader2,
  MapPin,
  PackageCheck,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Smartphone,
  XCircle,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import styles from "./scanner.module.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

type ScanSource =
  | "camera"
  | "zebra"
  | "manual"
  | "barcode_scanner";

type Position = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

type ScanResult = {
  success?: boolean;
  duplicate?: boolean;
  rejected?: boolean;
  scan_status?: "accepted" | "duplicate" | "rejected";
  message?: string;
  scan_type?: string;
  operation_completed?: boolean;
  package?: {
    id?: number;
    order_id?: number;
    barcode?: string;
    package_number?: number;
    current_status?: string;
    order_number?: string;
  } | null;
  operation?: {
    id?: number;
    operation_type?: string;
    warehouse_name?: string | null;
    status?: string;
  } | null;
};

type BarcodeDetectorInstance = {
  detect: (
    source: CanvasImageSource,
  ) => Promise<Array<{ rawValue?: string }>>;
};

type BarcodeDetectorConstructor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorInstance;

function getToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    localStorage.getItem("glory_token") ||
    sessionStorage.getItem("glory_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    ""
  );
}

function operationLabel(value?: string) {
  switch (value) {
    case "pickup":
      return "Ramassage";
    case "warehouse_in":
      return "Entrée entrepôt";
    case "warehouse_storage":
      return "Mise en entrepôt";
    case "warehouse_out":
      return "Sortie entrepôt";
    case "load_vehicle":
      return "Chargement véhicule";
    case "delivery":
      return "Livraison";
    case "incident":
      return "Incident";
    default:
      return value || "Opération";
  }
}

export default function DriverScannerPage() {
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const detectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const lastDetectedRef = useRef<string>("");
  const lastDetectedAtRef = useRef<number>(0);

  const [manualCode, setManualCode] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(true);
  const [cameraError, setCameraError] = useState("");
  const [position, setPosition] = useState<Position | null>(null);
  const [positionMessage, setPositionMessage] = useState(
    "Recherche de votre position...",
  );
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [lastCode, setLastCode] = useState("");

  const resultTone = useMemo(() => {
    if (!result) return "";
    if (result.scan_status === "accepted") return styles.success;
    if (result.scan_status === "duplicate") return styles.warning;
    return styles.danger;
  }, [result]);

  const stopCamera = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
  }, []);

  const submitCode = useCallback(
    async (
      rawCode: string,
      source: ScanSource,
    ) => {
      const scannedCode = rawCode.trim();

      if (!scannedCode || submitting) {
        return;
      }

      const token = getToken();

      if (!token) {
        router.replace("/login");
        return;
      }

      setSubmitting(true);
      setResult(null);
      setLastCode(scannedCode);

      try {
        const response = await fetch(
          `${API_URL}/api/drivers/me/scan`,
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              scanned_code: scannedCode,
              scan_type: "auto",
              scan_source: source,
              latitude: position?.latitude ?? null,
              longitude: position?.longitude ?? null,
              accuracy: position?.accuracy ?? null,
              device_type: "web_driver_scanner",
              device_name:
                typeof navigator !== "undefined"
                  ? navigator.userAgent.slice(0, 140)
                  : null,
            }),
          },
        );

        let payload: ScanResult = {};

        try {
          payload = await response.json();
        } catch {
          payload = {
            success: false,
            message: "Réponse serveur invalide.",
          };
        }

        setResult(payload);

        if (!response.ok && !payload.message) {
          setResult({
            ...payload,
            success: false,
            scan_status: "rejected",
            message: `Erreur API (${response.status}).`,
          });
        }

        if (response.ok) {
          setManualCode("");
        }
      } catch (error) {
        console.error(error);
        setResult({
          success: false,
          scan_status: "rejected",
          message:
            "Impossible de communiquer avec Glory Solutions.",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [position, router, submitting],
  );

  const scanFrame = useCallback(async () => {
    if (
      !videoRef.current ||
      !detectorRef.current ||
      videoRef.current.readyState < 2
    ) {
      frameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    try {
      const barcodes = await detectorRef.current.detect(
        videoRef.current,
      );

      const code = barcodes[0]?.rawValue?.trim() || "";

      if (code) {
        const now = Date.now();
        const sameRecentCode =
          lastDetectedRef.current === code &&
          now - lastDetectedAtRef.current < 3500;

        if (!sameRecentCode) {
          lastDetectedRef.current = code;
          lastDetectedAtRef.current = now;
          await submitCode(code, "camera");
        }
      }
    } catch (error) {
      console.error("Détection barcode :", error);
    }

    frameRef.current = requestAnimationFrame(scanFrame);
  }, [submitCode]);

  const startCamera = useCallback(async () => {
    setCameraError("");
    setResult(null);

    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setCameraSupported(false);
      setCameraError(
        "La caméra n'est pas disponible sur cet appareil.",
      );
      return;
    }

    const BarcodeDetectorApi = (
      window as Window & {
        BarcodeDetector?: BarcodeDetectorConstructor;
      }
    ).BarcodeDetector;

    if (!BarcodeDetectorApi) {
      setCameraSupported(false);
      setCameraError(
        "Ce navigateur ne prend pas en charge la lecture automatique. Utilisez la saisie/scanner matériel ci-dessous.",
      );
      return;
    }

    try {
      detectorRef.current = new BarcodeDetectorApi({
        formats: [
          "qr_code",
          "code_128",
          "code_39",
          "ean_13",
          "ean_8",
          "upc_a",
          "upc_e",
        ],
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: "environment",
          },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
      frameRef.current = requestAnimationFrame(scanFrame);
    } catch (error) {
      console.error(error);
      setCameraError(
        "Impossible d'ouvrir la caméra. Vérifiez l'autorisation caméra.",
      );
      setCameraActive(false);
    }
  }, [scanFrame]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setPositionMessage("GPS indisponible sur cet appareil.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (gps) => {
        setPosition({
          latitude: gps.coords.latitude,
          longitude: gps.coords.longitude,
          accuracy: gps.coords.accuracy ?? null,
        });

        setPositionMessage(
          gps.coords.accuracy
            ? `GPS prêt · précision ±${Math.round(
                gps.coords.accuracy,
              )} m`
            : "GPS prêt",
        );
      },
      () => {
        setPositionMessage(
          "GPS non autorisé. Le scan peut continuer, mais sans position.",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 5000,
      },
    );
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => router.push("/dashboard/driver")}
        >
          <ArrowLeft size={18} />
          Retour
        </button>

        <div>
          <span>GLORY SOLUTIONS</span>
          <h1>Scanner un colis</h1>
          <p>
            Le système vérifie automatiquement votre opération assignée.
          </p>
        </div>
      </header>

      <section className={styles.securityBanner}>
        <ShieldCheck size={20} />
        <div>
          <strong>Scan sécurisé</strong>
          <p>
            L'heure est enregistrée par le serveur et le chauffeur est identifié depuis sa session.
          </p>
        </div>
      </section>

      <section className={styles.grid}>
        <article className={styles.scannerCard}>
          <div className={styles.cardTitle}>
            <div className={styles.iconBox}>
              <Camera size={22} />
            </div>
            <div>
              <span>CAMÉRA</span>
              <h2>Lecture QR / code-barres</h2>
            </div>
          </div>

          <div className={styles.videoWrap}>
            <video
              ref={videoRef}
              className={styles.video}
              playsInline
              muted
            />

            {!cameraActive && (
              <div className={styles.videoPlaceholder}>
                <ScanLine size={46} />
                <strong>Caméra arrêtée</strong>
                <span>
                  Placez le code au centre du cadre.
                </span>
              </div>
            )}

            {cameraActive && (
              <div className={styles.scanOverlay}>
                <div className={styles.scanFrame} />
              </div>
            )}
          </div>

          {cameraError && (
            <div className={styles.inlineWarning}>
              <AlertTriangle size={17} />
              {cameraError}
            </div>
          )}

          <div className={styles.cameraActions}>
            {!cameraActive ? (
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => void startCamera()}
                disabled={!cameraSupported && !!cameraError}
              >
                <Camera size={18} />
                Ouvrir la caméra
              </button>
            ) : (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={stopCamera}
              >
                <XCircle size={18} />
                Fermer la caméra
              </button>
            )}
          </div>
        </article>

        <article className={styles.manualCard}>
          <div className={styles.cardTitle}>
            <div className={styles.iconBox}>
              <Keyboard size={22} />
            </div>
            <div>
              <span>MANUEL / ZEBRA</span>
              <h2>Entrer ou scanner le code</h2>
            </div>
          </div>

          <p className={styles.helperText}>
            Vous pouvez taper le numéro de commande ou utiliser plus tard le Zebra TC77 comme scanner clavier.
          </p>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitCode(manualCode, "manual");
            }}
            className={styles.manualForm}
          >
            <label htmlFor="scan-code">
              Code du colis
            </label>

            <div className={styles.inputWrap}>
              <ScanLine size={19} />
              <input
                id="scan-code"
                type="text"
                autoComplete="off"
                autoCapitalize="characters"
                placeholder="GLY-2026-000125-P01"
                value={manualCode}
                onChange={(event) =>
                  setManualCode(event.target.value.toUpperCase())
                }
              />
            </div>

            <button
              type="submit"
              className={styles.primaryButton}
              disabled={!manualCode.trim() || submitting}
            >
              {submitting ? (
                <Loader2
                  size={18}
                  className={styles.spin}
                />
              ) : (
                <PackageCheck size={18} />
              )}
              Valider le scan
            </button>
          </form>

          <div className={styles.deviceInfo}>
            <Smartphone size={18} />
            <div>
              <strong>Téléphone aujourd'hui, Zebra demain</strong>
              <span>
                Le backend et les codes restent exactement les mêmes.
              </span>
            </div>
          </div>
        </article>
      </section>

      <section className={styles.gpsCard}>
        <MapPin size={19} />
        <div>
          <strong>Position du scan</strong>
          <span>{positionMessage}</span>
        </div>
      </section>

      {submitting && (
        <section className={styles.processingCard}>
          <Loader2 size={22} className={styles.spin} />
          <div>
            <strong>Vérification en cours...</strong>
            <span>
              Glory vérifie le colis, votre compte et votre opération Dispatch.
            </span>
          </div>
        </section>
      )}

      {result && !submitting && (
        <section className={`${styles.resultCard} ${resultTone}`}>
          <div className={styles.resultIcon}>
            {result.scan_status === "accepted" ? (
              <CheckCircle2 size={28} />
            ) : result.scan_status === "duplicate" ? (
              <RotateCcw size={28} />
            ) : (
              <AlertTriangle size={28} />
            )}
          </div>

          <div className={styles.resultContent}>
            <span>
              {result.scan_status === "accepted"
                ? "SCAN ACCEPTÉ"
                : result.scan_status === "duplicate"
                  ? "DÉJÀ SCANNÉ"
                  : "SCAN REFUSÉ"}
            </span>

            <h2>{result.message || "Résultat du scan"}</h2>

            <div className={styles.resultDetails}>
              <div>
                <small>Code</small>
                <strong>
                  {result.package?.barcode || lastCode}
                </strong>
              </div>

              <div>
                <small>Opération</small>
                <strong>
                  {operationLabel(result.scan_type)}
                </strong>
              </div>

              {result.operation?.warehouse_name && (
                <div>
                  <small>Entrepôt</small>
                  <strong>
                    {result.operation.warehouse_name}
                  </strong>
                </div>
              )}
            </div>

            {result.operation_completed && (
              <div className={styles.completedBadge}>
                <CheckCircle2 size={16} />
                Opération terminée
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}