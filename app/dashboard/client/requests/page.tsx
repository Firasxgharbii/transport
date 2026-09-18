"use client";

import { useMemo, useState } from "react";

import AddressAutocomplete, {
  type SelectedAddress,
} from "../components/AddressAutocomplete";

type AddressType = "residential" | "commercial";
type PackageType = "box" | "pallet";
type DimensionUnit = "cm" | "in";
type WeightUnit = "lb" | "kg";
type DateChoice = "today" | "tomorrow" | "custom";
type ServiceLevel = "standard" | "same_day" | "urgent";

type PackageItem = {
  weight: string;
  length: string;
  width: string;
  height: string;
};

export default function RequestsPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDeliveryAddress, setSelectedDeliveryAddress] =
    useState<SelectedAddress | null>(null);

  const [form, setForm] = useState({
    deliveryAddress: "",
    deliveryUnit: "",

    addressType: "residential" as AddressType,

    companyName: "",
    contactName: "",
    contactPhone: "",
    contactExtension: "",

    packageType: "box" as PackageType,
    quantity: "1",

    weight: "",
    weightUnit: "lb" as WeightUnit,

    length: "",
    width: "",
    height: "",
    dimensionUnit: "in" as DimensionUnit,

    serviceLevel: "standard" as ServiceLevel,

    dateChoice: "today" as DateChoice,
    customDate: "",

    pickupAppointment: false,
    pickupTime: "",
    deliveryAppointment: false,
    deliveryDate: "",
    deliveryTime: "",

    notes: "",

    signatureRequired: false,
  });

  const [createdReference, setCreatedReference] = useState("");
  const [packageItems, setPackageItems] = useState<PackageItem[]>([
    { weight: "", length: "", width: "", height: "" },
  ]);

  const totalWeight = useMemo(
    () => packageItems.reduce((sum, item) => sum + (Number(item.weight) || 0), 0),
    [packageItems]
  );

  const deliveryProofLabel = useMemo(() => {
    return form.signatureRequired
      ? "Signature obligatoire"
      : "Photo obligatoire";
  }, [form.signatureRequired]);

  function updateField(
    field: keyof typeof form,
    value: string | boolean
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function changeQuantity(value: string) {
    const numeric = Math.max(1, Math.min(100, Number.parseInt(value || "1", 10) || 1));
    updateField("quantity", String(numeric));
    setPackageItems((previous) =>
      Array.from({ length: numeric }, (_, index) =>
        previous[index] || { weight: "", length: "", width: "", height: "" }
      )
    );
  }

  function updatePackage(index: number, field: keyof PackageItem, value: string) {
    setPackageItems((previous) =>
      previous.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  }

  function handleContinue() {
    if (!form.deliveryAddress.trim()) {
      alert("Veuillez entrer l’adresse de livraison.");
      return;
    }

    if (!selectedDeliveryAddress) {
      alert("Veuillez sélectionner une adresse valide dans les suggestions.");
      return;
    }

    if (!form.quantity || Number(form.quantity) <= 0) {
      alert("Veuillez entrer une quantité valide.");
      return;
    }

    const invalidPackageIndex = packageItems.findIndex(
      (item) => !item.weight || Number(item.weight) <= 0
    );
    if (invalidPackageIndex !== -1) {
      alert(`Veuillez entrer un poids valide pour ${form.packageType === "pallet" ? "la palette" : "la boîte"} ${invalidPackageIndex + 1}.`);
      return;
    }

    if (form.dateChoice === "custom" && !form.customDate) {
      alert("Veuillez choisir une date de ramassage.");
      return;
    }

    if (form.pickupAppointment && !form.pickupTime) {
      alert("Veuillez choisir l’heure du rendez-vous de ramassage.");
      return;
    }

    if (form.deliveryAppointment && !form.deliveryDate) {
      alert("Veuillez choisir la date du rendez-vous de livraison.");
      return;
    }

    if (form.deliveryAppointment && !form.deliveryTime) {
      alert("Veuillez choisir l’heure du rendez-vous de livraison.");
      return;
    }

    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleConfirmOrder() {
    if (submitting) return;

    try {
      setSubmitting(true);

      const token = localStorage.getItem("glory_token");
      if (!token) {
        alert("Votre session a expiré. Veuillez vous reconnecter.");
        window.location.href = "/login";
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

      const pickupDate =
        form.dateChoice === "custom"
          ? form.customDate
          : (() => {
              const date = new Date();
              if (form.dateChoice === "tomorrow") {
                date.setDate(date.getDate() + 1);
              }
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, "0");
              const day = String(date.getDate()).padStart(2, "0");
              return `${year}-${month}-${day}`;
            })();

      const deliveryDate = form.deliveryAppointment
        ? form.deliveryDate
        : pickupDate;

      const response = await fetch(`${apiUrl}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          service_type: "pickup_delivery",
          service_level: form.serviceLevel,

          delivery_address: selectedDeliveryAddress?.formattedAddress || form.deliveryAddress.trim(),
          delivery_city: selectedDeliveryAddress?.city || null,
          delivery_province: selectedDeliveryAddress?.province || null,
          delivery_postal_code: selectedDeliveryAddress?.postalCode || null,
          delivery_country: selectedDeliveryAddress?.country || null,
          delivery_latitude: selectedDeliveryAddress?.latitude ?? null,
          delivery_longitude: selectedDeliveryAddress?.longitude ?? null,
          delivery_unit: form.deliveryUnit.trim() || null,
          destination_type: form.addressType,

          company_name:
            form.addressType === "commercial"
              ? form.companyName.trim() || null
              : null,

          contact_name: form.contactName.trim() || null,
          contact_phone: form.contactPhone.trim() || null,
          contact_extension: form.contactExtension.trim() || null,

          package_type: form.packageType,
          quantity: packageItems.length,
          weight: totalWeight,
          weight_unit: form.weightUnit,

          length: packageItems[0]?.length ? Number(packageItems[0].length) : null,
          width: packageItems[0]?.width ? Number(packageItems[0].width) : null,
          height: packageItems[0]?.height ? Number(packageItems[0].height) : null,
          dimension_unit: form.dimensionUnit,

          packages: packageItems.map((item, index) => ({
            package_number: index + 1,
            package_type: form.packageType,
            weight: Number(item.weight),
            weight_unit: form.weightUnit,
            length: item.length ? Number(item.length) : null,
            width: item.width ? Number(item.width) : null,
            height: item.height ? Number(item.height) : null,
            dimension_unit: form.dimensionUnit,
          })),

          pickup_appointment: form.pickupAppointment,
          pickup_date: pickupDate,
          pickup_time: form.pickupAppointment ? form.pickupTime : null,

          delivery_appointment: form.deliveryAppointment,
          delivery_date: deliveryDate,
          delivery_time: form.deliveryAppointment ? form.deliveryTime : null,

          description:
            form.packageType === "pallet"
              ? `${packageItems.length} palette(s)`
              : `${packageItems.length} colis`,

          notes: form.notes.trim() || null,
          signature_required: form.signatureRequired,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("glory_token");
          alert(
            "Votre session a expiré. Veuillez vous reconnecter."
          );
          window.location.href = "/login";
          return;
        }

        throw new Error(
          payload?.message ||
            payload?.error ||
            "Impossible de créer la commande."
        );
      }

      const order = payload?.order || payload?.data;
      const reference = order?.order_number;

      if (!reference) {
        throw new Error(
          "La commande a été créée, mais la référence est introuvable."
        );
      }

      setCreatedReference(reference);
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Impossible de créer la commande."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <div style={headerStyle}>
          <div>
            <p style={eyebrowStyle}>Glory Solutions</p>

            <h1 style={pageTitleStyle}>
              Nouvelle commande
            </h1>

            <p style={subtitleStyle}>
              Créez une demande de ramassage et de livraison.
            </p>
          </div>

          <div style={stepsStyle}>
            <StepCircle number="1" active={step === 1} done={step > 1} />
            <StepLine active={step > 1} />
            <StepCircle number="2" active={step === 2} done={step > 2} />
            <StepLine active={step > 2} />
            <StepCircle number="3" active={step === 3} done={false} />
          </div>
        </div>

        {step === 1 && (
          <>
            <Section
              title="Livraison"
              subtitle="Indiquez précisément où la commande doit être livrée."
            >
              <div style={deliveryIntroStyle}>
                <div style={deliveryIntroIconStyle}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                </div>
                <div>
                  <strong style={deliveryIntroTitleStyle}>Destination</strong>
                  <p style={deliveryIntroTextStyle}>
                    Recherchez l’adresse, puis sélectionnez une suggestion pour la vérifier automatiquement.
                  </p>
                </div>
              </div>

              <Field label="Adresse de livraison *">
                <AddressAutocomplete
                  value={form.deliveryAddress}
                  onChange={(value) => {
                    updateField("deliveryAddress", value);
                    setSelectedDeliveryAddress(null);
                  }}
                  onSelect={(address) => {
                    setSelectedDeliveryAddress(address);
                    updateField("deliveryAddress", address.formattedAddress);
                  }}
                  country="ca"
                  placeholder="Ex. 5975 Avenue de l'Authion, Montréal"
                  inputStyle={smartAddressInputStyle}
                />

                {selectedDeliveryAddress ? (
                  <div style={verifiedAddressStyle}>
                    <div style={verifiedIconStyle}>✓</div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={verifiedTopRowStyle}>
                        <strong style={verifiedTitleStyle}>Adresse vérifiée</strong>
                        <span style={verifiedBadgeStyle}>VALIDÉE</span>
                      </div>
                      <div style={verifiedAddressTextStyle}>
                        {selectedDeliveryAddress.formattedAddress}
                      </div>
                      <div style={verifiedMetaStyle}>
                        {[
                          selectedDeliveryAddress.city,
                          selectedDeliveryAddress.province,
                          selectedDeliveryAddress.postalCode,
                          selectedDeliveryAddress.country,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p style={helperStyle}>
                    Saisissez au moins 3 caractères et choisissez une adresse dans la liste.
                  </p>
                )}
              </Field>

              <Field label="Type de destination *">
                <div style={choiceGridStyle}>
                  <ChoiceCard
                    selected={form.addressType === "residential"}
                    onClick={() => updateField("addressType", "residential")}
                    title="Résidentiel"
                    description="Maison, condo ou immeuble résidentiel."
                  />
                  <ChoiceCard
                    selected={form.addressType === "commercial"}
                    onClick={() => updateField("addressType", "commercial")}
                    title="Commercial"
                    description="Entreprise, bureau, commerce ou entrepôt."
                  />
                </div>
              </Field>

              <div style={destinationDetailsStyle}>
                <div style={destinationDetailsHeaderStyle}>
                  <div>
                    <h3 style={smallTitleStyle}>
                      {form.addressType === "commercial"
                        ? "Détails de l’entreprise"
                        : "Détails de la résidence"}
                    </h3>
                    <p style={helperStyle}>
                      Ces informations aident le chauffeur à trouver la bonne porte rapidement.
                    </p>
                  </div>
                  <span style={optionalBadgeStyle}>Informations de livraison</span>
                </div>

                <div style={twoColumnsStyle}>
                  <Field
                    label={
                      form.addressType === "commercial"
                        ? "Suite / Bureau / Unité"
                        : "Appartement / Unité"
                    }
                  >
                    <input
                      value={form.deliveryUnit}
                      onChange={(e) => updateField("deliveryUnit", e.target.value)}
                      placeholder={
                        form.addressType === "commercial"
                          ? "Ex. Suite 210, Bureau 4"
                          : "Ex. Appartement 20"
                      }
                      style={inputStyle}
                    />
                  </Field>

                  {form.addressType === "commercial" && (
                    <Field label="Nom de l’entreprise">
                      <input
                        value={form.companyName}
                        onChange={(e) => updateField("companyName", e.target.value)}
                        placeholder="Ex. Entreprise ABC"
                        style={inputStyle}
                      />
                    </Field>
                  )}
                </div>

                <div style={twoColumnsStyle}>
                  <Field label="Nom du destinataire">
                    <input
                      value={form.contactName}
                      onChange={(e) => updateField("contactName", e.target.value)}
                      placeholder="Ex. Marie Tremblay"
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Téléphone">
                    <input
                      type="tel"
                      value={form.contactPhone}
                      onChange={(e) => updateField("contactPhone", e.target.value)}
                      placeholder="Ex. 514 555-0123"
                      style={inputStyle}
                    />
                  </Field>
                </div>

                {form.addressType === "commercial" && (
                  <Field label="Extension téléphonique">
                    <input
                      value={form.contactExtension}
                      onChange={(e) => updateField("contactExtension", e.target.value)}
                      placeholder="Ex. 204"
                      style={inputStyle}
                    />
                  </Field>
                )}
              </div>
            </Section>

            <Section
              title="Colis"
              subtitle="Ajoutez le poids et les dimensions de chaque unité physique."
            >
              <Field label="Type de colis *">
                <div style={choiceGridStyle}>
                  <ChoiceCard
                    selected={form.packageType === "box"}
                    onClick={() => updateField("packageType", "box")}
                    title="Boîte"
                    description="Colis ou boîte individuelle."
                  />
                  <ChoiceCard
                    selected={form.packageType === "pallet"}
                    onClick={() => updateField("packageType", "pallet")}
                    title="Palette"
                    description="Marchandise sur palette."
                  />
                </div>
              </Field>

              <div style={twoColumnsStyle}>
                <Field label="Quantité *">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={form.quantity}
                    onChange={(e) => changeQuantity(e.target.value)}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Poids total calculé">
                  <div style={{ ...inputStyle, display: "flex", alignItems: "center", background: "#f8f8fa", fontWeight: 800 }}>
                    {totalWeight.toFixed(2)} {form.weightUnit}
                  </div>
                </Field>
              </div>

              <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
                {packageItems.map((item, index) => (
                  <div key={index} style={dimensionsBoxStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 16 }}>
                      <div>
                        <h3 style={smallTitleStyle}>
                          {form.packageType === "pallet" ? "Palette" : "Boîte"} {String(index + 1).padStart(2, "0")}
                        </h3>
                        <p style={helperStyle}>Mesures propres à cette unité</p>
                      </div>
                      <span style={optionalBadgeStyle}>#{index + 1}/{packageItems.length}</span>
                    </div>

                    <div style={dimensionsGridStyle}>
                      <Field label="Poids *">
                        <input type="number" min="0.01" step="0.01" value={item.weight} onChange={(e) => updatePackage(index, "weight", e.target.value)} placeholder="Ex. 12" style={inputStyle} />
                      </Field>
                      <Field label="Longueur">
                        <input type="number" min="0" step="0.01" value={item.length} onChange={(e) => updatePackage(index, "length", e.target.value)} placeholder="Ex. 20" style={inputStyle} />
                      </Field>
                      <Field label="Largeur">
                        <input type="number" min="0" step="0.01" value={item.width} onChange={(e) => updatePackage(index, "width", e.target.value)} placeholder="Ex. 15" style={inputStyle} />
                      </Field>
                      <Field label="Hauteur">
                        <input type="number" min="0" step="0.01" value={item.height} onChange={(e) => updatePackage(index, "height", e.target.value)} placeholder="Ex. 10" style={inputStyle} />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ ...twoColumnsStyle, marginTop: 18 }}>
                <Field label="Unité de poids">
                  <select value={form.weightUnit} onChange={(e) => updateField("weightUnit", e.target.value)} style={inputStyle}>
                    <option value="lb">lb</option>
                    <option value="kg">kg</option>
                  </select>
                </Field>
                <Field label="Unité des dimensions">
                  <select value={form.dimensionUnit} onChange={(e) => updateField("dimensionUnit", e.target.value)} style={inputStyle}>
                    <option value="in">Pouces</option>
                    <option value="cm">Centimètres</option>
                  </select>
                </Field>
              </div>
            </Section>

            <Section
              title="Niveau de service"
              subtitle="Choisissez la priorité de traitement de cette commande."
            >
              <div style={choiceGridThreeStyle}>
                <ChoiceCard
                  selected={form.serviceLevel === "standard"}
                  onClick={() => updateField("serviceLevel", "standard")}
                  title="Standard"
                  description="Traitement régulier selon les délais de Glory Solutions."
                />
                <ChoiceCard
                  selected={form.serviceLevel === "same_day"}
                  onClick={() => {
                    updateField("serviceLevel", "same_day");
                    updateField("dateChoice", "today");
                  }}
                  title="Jour même"
                  description="Ramassage et traitement le jour même."
                />
                <ChoiceCard
                  selected={form.serviceLevel === "urgent"}
                  onClick={() => updateField("serviceLevel", "urgent")}
                  title="Urgent"
                  description="Commande prioritaire nécessitant un traitement rapide."
                />
              </div>
            </Section>

            <Section
              title="Ramassage"
              subtitle="Choisissez la date et indiquez si un rendez-vous précis est requis."
            >
              <div style={choiceGridThreeStyle}>
                <ChoiceCard selected={form.dateChoice === "today"} onClick={() => updateField("dateChoice", "today")} title="Aujourd’hui" description="Ramassage aujourd’hui." />
                <ChoiceCard selected={form.dateChoice === "tomorrow"} onClick={() => updateField("dateChoice", "tomorrow")} title="Demain" description="Ramassage demain." />
                <ChoiceCard selected={form.dateChoice === "custom"} onClick={() => updateField("dateChoice", "custom")} title="Autre date" description="Choisir une date précise." />
              </div>

              {form.dateChoice === "custom" && (
                <Field label="Date de ramassage *">
                  <input type="date" value={form.customDate} onChange={(e) => updateField("customDate", e.target.value)} style={inputStyle} />
                </Field>
              )}

              <label style={signatureCardStyle}>
                <input type="checkbox" checked={form.pickupAppointment} onChange={(e) => updateField("pickupAppointment", e.target.checked)} style={{ width: "20px", height: "20px" }} />
                <div>
                  <strong style={signatureTitleStyle}>Rendez-vous requis pour le ramassage</strong>
                  <p style={helperStyle}>Cochez cette option si le chauffeur doit se présenter à une heure précise.</p>
                </div>
              </label>

              {form.pickupAppointment && (
                <Field label="Heure du rendez-vous de ramassage *">
                  <input type="time" value={form.pickupTime} onChange={(e) => updateField("pickupTime", e.target.value)} style={inputStyle} />
                </Field>
              )}
            </Section>

            <Section
              title="Livraison"
              subtitle="Indiquez si la livraison nécessite également un rendez-vous précis."
            >
              <label style={signatureCardStyle}>
                <input type="checkbox" checked={form.deliveryAppointment} onChange={(e) => updateField("deliveryAppointment", e.target.checked)} style={{ width: "20px", height: "20px" }} />
                <div>
                  <strong style={signatureTitleStyle}>Rendez-vous requis pour la livraison</strong>
                  <p style={helperStyle}>Cochez cette option si le destinataire exige une date et une heure précises.</p>
                </div>
              </label>

              {form.deliveryAppointment && (
                <div style={twoColumnsStyle}>
                  <Field label="Date de livraison *">
                    <input type="date" value={form.deliveryDate} onChange={(e) => updateField("deliveryDate", e.target.value)} style={inputStyle} />
                  </Field>
                  <Field label="Heure de livraison *">
                    <input type="time" value={form.deliveryTime} onChange={(e) => updateField("deliveryTime", e.target.value)} style={inputStyle} />
                  </Field>
                </div>
              )}
            </Section>

            <Section
              title="Instructions"
              subtitle="Ajoutez des indications utiles pour le chauffeur."
            >
              <textarea
                value={form.notes}
                onChange={(e) =>
                  updateField("notes", e.target.value)
                }
                placeholder="Ex. Appelez 10 minutes avant, quai de chargement à l’arrière..."
                rows={5}
                style={textareaStyle}
              />
            </Section>

            <Section
              title="Preuve de livraison"
              subtitle="La photo est utilisée automatiquement si aucune signature n’est demandée."
            >
              <label style={signatureCardStyle}>
                <input
                  type="checkbox"
                  checked={form.signatureRequired}
                  onChange={(e) =>
                    updateField(
                      "signatureRequired",
                      e.target.checked
                    )
                  }
                  style={{
                    width: "20px",
                    height: "20px",
                  }}
                />

                <div>
                  <strong style={signatureTitleStyle}>
                    Signature requise
                  </strong>

                  <p style={helperStyle}>
                    {form.signatureRequired
                      ? "Le chauffeur devra obtenir une signature."
                      : "Non cochée : une photo sera obligatoire à la livraison."}
                  </p>
                </div>
              </label>
            </Section>

            <div style={footerActionsStyle}>
              <button
                onClick={handleContinue}
                style={primaryButtonStyle}
              >
                Continuer
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <Section
              title="Vérifiez votre commande"
              subtitle="Confirmez les informations avant l’envoi."
            >
              <SummaryRow
                label="Ramassage"
                value="Adresse principale enregistrée dans votre compte"
              />

              <SummaryRow
                label="Livraison"
                value={`${form.deliveryAddress}${
                  form.deliveryUnit
                    ? ` — ${form.deliveryUnit}`
                    : ""
                }`}
              />

              <SummaryRow
                label="Type d’adresse"
                value={
                  form.addressType === "commercial"
                    ? "Commercial"
                    : "Résidentiel"
                }
              />

              {form.addressType === "commercial" &&
                form.companyName && (
                  <SummaryRow
                    label="Entreprise"
                    value={form.companyName}
                  />
                )}

              {form.contactName && (
                <SummaryRow
                  label="Contact"
                  value={form.contactName}
                />
              )}

              {form.contactPhone && (
                <SummaryRow
                  label="Téléphone"
                  value={`${form.contactPhone}${
                    form.contactExtension
                      ? ` poste ${form.contactExtension}`
                      : ""
                  }`}
                />
              )}

              <SummaryRow
                label="Colis"
                value={`${form.packageType === "pallet" ? "Palette" : "Boîte"} × ${packageItems.length}`}
              />

              <SummaryRow
                label="Poids total"
                value={`${totalWeight.toFixed(2)} ${form.weightUnit}`}
              />

              {packageItems.map((item, index) => (
                <SummaryRow
                  key={`package-summary-${index}`}
                  label={`${form.packageType === "pallet" ? "Palette" : "Boîte"} ${String(index + 1).padStart(2, "0")}`}
                  value={`${item.weight} ${form.weightUnit}${
                    item.length || item.width || item.height
                      ? ` — ${item.length || "-"} × ${item.width || "-"} × ${item.height || "-"} ${form.dimensionUnit}`
                      : ""
                  }`}
                />
              ))}

              <SummaryRow
                label="Niveau de service"
                value={
                  form.serviceLevel === "urgent"
                    ? "Urgent"
                    : form.serviceLevel === "same_day"
                    ? "Jour même"
                    : "Standard"
                }
              />

              <SummaryRow
                label="Ramassage"
                value={`${
                  form.dateChoice === "today"
                    ? "Aujourd’hui"
                    : form.dateChoice === "tomorrow"
                    ? "Demain"
                    : form.customDate
                }${form.pickupAppointment ? ` à ${form.pickupTime} — rendez-vous` : " — sans rendez-vous"}`}
              />

              <SummaryRow
                label="Livraison planifiée"
                value={
                  form.deliveryAppointment
                    ? `${form.deliveryDate} à ${form.deliveryTime} — rendez-vous`
                    : "Sans rendez-vous précis"
                }
              />

              <SummaryRow
                label="Preuve de livraison"
                value={deliveryProofLabel}
              />

              {form.notes && (
                <SummaryRow
                  label="Instructions"
                  value={form.notes}
                />
              )}
            </Section>

            <div style={footerActionsBetweenStyle}>
              <button
                onClick={() => setStep(1)}
                style={secondaryButtonStyle}
              >
                Retour
              </button>

              <button
                onClick={handleConfirmOrder}
                disabled={submitting}
                style={primaryButtonStyle}
              >
                Confirmer la commande
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <div style={successCardStyle}>
            <div style={successIconStyle}>
              ✓
            </div>

            <p style={eyebrowStyle}>
              Commande créée
            </p>

            <h2 style={successTitleStyle}>
              {createdReference}
            </h2>

            <p style={successTextStyle}>
              Votre demande a été enregistrée.
              Vous pourrez ensuite suivre son
              évolution depuis Mes commandes.
            </p>

            <div style={successActionsStyle}>
              <button
                style={primaryButtonStyle}
                onClick={() =>
                  alert(
                    "L’impression Glory 4x6 sera connectée à cette commande."
                  )
                }
              >
                Imprimer l’étiquette
              </button>

              <button
                style={secondaryButtonStyle}
                onClick={() =>
                  (window.location.href =
                    "/dashboard/client/orders")
                }
              >
                Voir mes commandes
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={sectionStyle}>
      <div style={sectionHeaderStyle}>
        <h2 style={sectionTitleStyle}>
          {title}
        </h2>

        {subtitle && (
          <p style={sectionSubtitleStyle}>
            {subtitle}
          </p>
        )}
      </div>

      <div style={sectionContentStyle}>
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={fieldStyle}>
      <span style={fieldLabelStyle}>
        {label}
      </span>

      {children}
    </label>
  );
}

function ChoiceCard({
  selected,
  onClick,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...choiceCardStyle,
        borderColor: selected
          ? "#ff003d"
          : "#e6e6eb",
        background: selected
          ? "#fff5f7"
          : "#ffffff",
      }}
    >
      <span
        style={{
          ...radioStyle,
          borderColor: selected
            ? "#ff003d"
            : "#b9b9c2",
        }}
      >
        {selected && (
          <span style={radioDotStyle} />
        )}
      </span>

      <span>
        <strong style={choiceTitleStyle}>
          {title}
        </strong>

        <span style={choiceDescriptionStyle}>
          {description}
        </span>
      </span>
    </button>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={summaryRowStyle}>
      <span style={summaryLabelStyle}>
        {label}
      </span>

      <strong style={summaryValueStyle}>
        {value}
      </strong>
    </div>
  );
}

function StepCircle({
  number,
  active,
  done,
}: {
  number: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div
      style={{
        ...stepCircleStyle,
        background:
          active || done
            ? "#ff003d"
            : "#ededf1",
        color:
          active || done
            ? "#ffffff"
            : "#8d8d97",
      }}
    >
      {done ? "✓" : number}
    </div>
  );
}

function StepLine({
  active,
}: {
  active: boolean;
}) {
  return (
    <div
      style={{
        ...stepLineStyle,
        background: active
          ? "#ff003d"
          : "#ededf1",
      }}
    />
  );
}

const pageStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "100vh",
  padding: "40px",
  background: "#f6f6f8",
};

const containerStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "1100px",
  margin: "0 auto",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "30px",
  alignItems: "flex-start",
  marginBottom: "32px",
};

const eyebrowStyle: React.CSSProperties = {
  margin: "0 0 8px",
  color: "#ff003d",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "2px",
  textTransform: "uppercase",
};

const pageTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#17171c",
  fontSize: "38px",
  fontWeight: 900,
};

const subtitleStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#767680",
  fontSize: "14px",
};

const stepsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  marginTop: "8px",
};

const stepCircleStyle: React.CSSProperties = {
  width: "34px",
  height: "34px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: 900,
};

const stepLineStyle: React.CSSProperties = {
  width: "38px",
  height: "3px",
};

const sectionStyle: React.CSSProperties = {
  marginBottom: "22px",
  background: "#ffffff",
  border: "1px solid #e8e8ed",
  borderRadius: "18px",
  overflow: "hidden",
  boxShadow: "0 10px 30px rgba(0,0,0,0.035)",
};

const sectionHeaderStyle: React.CSSProperties = {
  padding: "24px 26px 18px",
  borderBottom: "1px solid #eeeeF2",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#17171c",
  fontSize: "19px",
  fontWeight: 900,
};

const sectionSubtitleStyle: React.CSSProperties = {
  margin: "7px 0 0",
  color: "#83838d",
  fontSize: "13px",
  lineHeight: 1.6,
};

const sectionContentStyle: React.CSSProperties = {
  display: "grid",
  gap: "20px",
  padding: "26px",
};

const fieldStyle: React.CSSProperties = {
  display: "grid",
  gap: "8px",
};

const fieldLabelStyle: React.CSSProperties = {
  color: "#33333a",
  fontSize: "12px",
  fontWeight: 800,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "48px",
  padding: "0 14px",
  border: "1px solid #ddddE4",
  borderRadius: "12px",
  background: "#ffffff",
  color: "#17171c",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px",
  border: "1px solid #ddddE4",
  borderRadius: "12px",
  background: "#ffffff",
  color: "#17171c",
  fontSize: "14px",
  lineHeight: 1.6,
  resize: "vertical",
  outline: "none",
  boxSizing: "border-box",
};

const helperStyle: React.CSSProperties = {
  margin: "5px 0 0",
  color: "#93939c",
  fontSize: "11px",
  lineHeight: 1.5,
};

const twoColumnsStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "18px",
};

const choiceGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(210px, 1fr))",
  gap: "12px",
};

const choiceGridThreeStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
};

const choiceCardStyle: React.CSSProperties = {
  width: "100%",
  padding: "16px",
  border: "1px solid",
  borderRadius: "13px",
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  textAlign: "left",
  cursor: "pointer",
};

const radioStyle: React.CSSProperties = {
  width: "18px",
  height: "18px",
  minWidth: "18px",
  borderRadius: "50%",
  border: "2px solid",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginTop: "2px",
};

const radioDotStyle: React.CSSProperties = {
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  background: "#ff003d",
};

const choiceTitleStyle: React.CSSProperties = {
  display: "block",
  color: "#202026",
  fontSize: "13px",
  fontWeight: 900,
};

const choiceDescriptionStyle: React.CSSProperties = {
  display: "block",
  marginTop: "4px",
  color: "#888892",
  fontSize: "11px",
  lineHeight: 1.5,
};

const inlineInputStyle: React.CSSProperties = {
  display: "flex",
};

const unitSelectStyle: React.CSSProperties = {
  width: "90px",
  border: "1px solid #ddddE4",
  borderLeft: 0,
  borderRadius: "0 12px 12px 0",
  background: "#f5f5f7",
  padding: "0 10px",
  fontWeight: 800,
};


const smartAddressInputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "54px",
  padding: "0 14px",
  background: "#ffffff",
  color: "#17171c",
  fontSize: "14px",
  boxSizing: "border-box",
};

const deliveryIntroStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "13px",
  padding: "14px 16px",
  border: "1px solid #eceef2",
  borderRadius: "14px",
  background: "#fafbfc",
};

const deliveryIntroIconStyle: React.CSSProperties = {
  width: "40px",
  height: "40px",
  minWidth: "40px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "11px",
  background: "#fff0f4",
  color: "#ff003d",
};

const deliveryIntroTitleStyle: React.CSSProperties = {
  display: "block",
  color: "#202126",
  fontSize: "13px",
  fontWeight: 900,
};

const deliveryIntroTextStyle: React.CSSProperties = {
  margin: "4px 0 0",
  color: "#7b7f89",
  fontSize: "11.5px",
  lineHeight: 1.5,
};

const verifiedAddressStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  marginTop: "10px",
  padding: "13px 14px",
  border: "1px solid #cfe9d8",
  borderRadius: "13px",
  background: "#f7fcf9",
};

const verifiedIconStyle: React.CSSProperties = {
  width: "30px",
  height: "30px",
  minWidth: "30px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  background: "#e5f7eb",
  color: "#168447",
  fontSize: "14px",
  fontWeight: 900,
};

const verifiedTopRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "8px",
};

const verifiedTitleStyle: React.CSSProperties = {
  color: "#17643a",
  fontSize: "12px",
  fontWeight: 900,
};

const verifiedBadgeStyle: React.CSSProperties = {
  padding: "3px 6px",
  borderRadius: "6px",
  background: "#e7f7ec",
  color: "#23824b",
  fontSize: "8px",
  fontWeight: 900,
  letterSpacing: ".08em",
};

const verifiedAddressTextStyle: React.CSSProperties = {
  marginTop: "5px",
  color: "#25272c",
  fontSize: "12.5px",
  fontWeight: 750,
  lineHeight: 1.4,
};

const verifiedMetaStyle: React.CSSProperties = {
  marginTop: "3px",
  color: "#7a7e87",
  fontSize: "10.5px",
  lineHeight: 1.4,
};

const destinationDetailsStyle: React.CSSProperties = {
  display: "grid",
  gap: "18px",
  padding: "18px",
  border: "1px solid #ececf0",
  borderRadius: "15px",
  background: "#fafafa",
};

const destinationDetailsHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "16px",
};

const optionalBadgeStyle: React.CSSProperties = {
  flexShrink: 0,
  padding: "5px 8px",
  border: "1px solid #e5e6ea",
  borderRadius: "8px",
  background: "#fff",
  color: "#8a8e98",
  fontSize: "9px",
  fontWeight: 800,
};

const dimensionsBoxStyle: React.CSSProperties = {
  padding: "18px",
  borderRadius: "14px",
  background: "#f8f8fa",
  border: "1px solid #ececf0",
};

const dimensionsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(140px, 1fr))",
  gap: "14px",
  marginTop: "14px",
};

const smallTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#25252b",
  fontSize: "14px",
  fontWeight: 900,
};

const signatureCardStyle: React.CSSProperties = {
  display: "flex",
  gap: "14px",
  alignItems: "flex-start",
  padding: "18px",
  border: "1px solid #dedee5",
  borderRadius: "14px",
  cursor: "pointer",
};

const signatureTitleStyle: React.CSSProperties = {
  display: "block",
  color: "#202026",
  fontSize: "14px",
  fontWeight: 900,
};

const footerActionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  paddingBottom: "35px",
};

const footerActionsBetweenStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "14px",
  paddingBottom: "35px",
};

const primaryButtonStyle: React.CSSProperties = {
  minHeight: "48px",
  padding: "0 24px",
  border: 0,
  borderRadius: "12px",
  background: "#ff003d",
  color: "#ffffff",
  fontSize: "13px",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  minHeight: "48px",
  padding: "0 24px",
  border: "1px solid #ddddE4",
  borderRadius: "12px",
  background: "#ffffff",
  color: "#25252b",
  fontSize: "13px",
  fontWeight: 800,
  cursor: "pointer",
};

const summaryRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "180px 1fr",
  gap: "20px",
  paddingBottom: "14px",
  borderBottom: "1px solid #eeeeF2",
};

const summaryLabelStyle: React.CSSProperties = {
  color: "#8a8a94",
  fontSize: "12px",
};

const summaryValueStyle: React.CSSProperties = {
  color: "#202026",
  fontSize: "13px",
  lineHeight: 1.5,
};

const successCardStyle: React.CSSProperties = {
  maxWidth: "680px",
  margin: "70px auto",
  padding: "50px",
  borderRadius: "22px",
  background: "#ffffff",
  border: "1px solid #e7e7ec",
  textAlign: "center",
  boxShadow: "0 15px 50px rgba(0,0,0,0.06)",
};

const successIconStyle: React.CSSProperties = {
  width: "62px",
  height: "62px",
  margin: "0 auto 22px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#edfff3",
  color: "#0e9f4b",
  fontSize: "28px",
  fontWeight: 900,
};

const successTitleStyle: React.CSSProperties = {
  margin: "8px 0 12px",
  color: "#17171c",
  fontSize: "30px",
  fontWeight: 900,
};

const successTextStyle: React.CSSProperties = {
  maxWidth: "480px",
  margin: "0 auto",
  color: "#777781",
  fontSize: "14px",
  lineHeight: 1.7,
};

const successActionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  flexWrap: "wrap",
  gap: "12px",
  marginTop: "28px",
};