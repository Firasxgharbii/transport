"use client";

import { useMemo, useState } from "react";

type AddressType = "residential" | "commercial";
type PackageType = "box" | "pallet";
type DimensionUnit = "cm" | "in";
type WeightUnit = "lb" | "kg";
type DateChoice = "today" | "tomorrow" | "custom";

export default function RequestsPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    pickupAddress: "",
    pickupUnit: "",

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

    dateChoice: "today" as DateChoice,
    customDate: "",

    notes: "",

    signatureRequired: false,
  });

  const [createdReference, setCreatedReference] = useState("");

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

  function handleContinue() {
    if (!form.pickupAddress.trim()) {
      alert("Veuillez entrer l’adresse de ramassage.");
      return;
    }

    if (!form.deliveryAddress.trim()) {
      alert("Veuillez entrer l’adresse de livraison.");
      return;
    }

    if (!form.quantity || Number(form.quantity) <= 0) {
      alert("Veuillez entrer une quantité valide.");
      return;
    }

    if (!form.weight || Number(form.weight) <= 0) {
      alert("Veuillez entrer un poids valide.");
      return;
    }

    if (form.dateChoice === "custom" && !form.customDate) {
      alert("Veuillez choisir une date.");
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

      const response = await fetch(`${apiUrl}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          delivery_address: form.deliveryAddress.trim(),
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
          quantity: Number(form.quantity),
          weight: Number(form.weight),
          weight_unit: form.weightUnit,
          length: form.length ? Number(form.length) : null,
          width: form.width ? Number(form.width) : null,
          height: form.height ? Number(form.height) : null,
          dimension_unit: form.dimensionUnit,
          pickup_date: pickupDate,
          notes: form.notes.trim() || null,
          signature_required: form.signatureRequired,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.message ||
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
              title="Ramassage"
              subtitle="L’adresse du client sera utilisée par défaut."
            >
              <Field label="Adresse de ramassage *">
                <input
                  value={form.pickupAddress}
                  onChange={(e) =>
                    updateField("pickupAddress", e.target.value)
                  }
                  placeholder="Ex. 1234 Rue Sherbrooke O, Montréal, QC"
                  style={inputStyle}
                />
              </Field>

              <Field label="Appartement / Suite / Unité">
                <input
                  value={form.pickupUnit}
                  onChange={(e) =>
                    updateField("pickupUnit", e.target.value)
                  }
                  placeholder="Optionnel"
                  style={inputStyle}
                />
              </Field>
            </Section>

            <Section
              title="Livraison"
              subtitle="Recherchez l’adresse exacte de destination."
            >
              <Field label="Adresse de livraison *">
                <input
                  value={form.deliveryAddress}
                  onChange={(e) =>
                    updateField("deliveryAddress", e.target.value)
                  }
                  placeholder="Commencez à taper une adresse..."
                  style={inputStyle}
                />

                <p style={helperStyle}>
                  La recherche Google d’adresse sera connectée ici.
                </p>
              </Field>

              <Field label="Appartement / Suite / Unité">
                <input
                  value={form.deliveryUnit}
                  onChange={(e) =>
                    updateField("deliveryUnit", e.target.value)
                  }
                  placeholder="Optionnel"
                  style={inputStyle}
                />
              </Field>

              <Field label="Type d’adresse *">
                <div style={choiceGridStyle}>
                  <ChoiceCard
                    selected={form.addressType === "residential"}
                    onClick={() =>
                      updateField("addressType", "residential")
                    }
                    title="Résidentiel"
                    description="Maison, condo ou appartement."
                  />

                  <ChoiceCard
                    selected={form.addressType === "commercial"}
                    onClick={() =>
                      updateField("addressType", "commercial")
                    }
                    title="Commercial"
                    description="Entreprise, bureau ou entrepôt."
                  />
                </div>
              </Field>

              {form.addressType === "commercial" && (
                <Field label="Nom de l’entreprise">
                  <input
                    value={form.companyName}
                    onChange={(e) =>
                      updateField("companyName", e.target.value)
                    }
                    placeholder="Optionnel"
                    style={inputStyle}
                  />
                </Field>
              )}

              <div style={twoColumnsStyle}>
                <Field label="Nom du contact">
                  <input
                    value={form.contactName}
                    onChange={(e) =>
                      updateField("contactName", e.target.value)
                    }
                    placeholder="Optionnel"
                    style={inputStyle}
                  />
                </Field>

                <Field label="Téléphone">
                  <input
                    value={form.contactPhone}
                    onChange={(e) =>
                      updateField("contactPhone", e.target.value)
                    }
                    placeholder="Optionnel"
                    style={inputStyle}
                  />
                </Field>
              </div>

              <Field label="Extension">
                <input
                  value={form.contactExtension}
                  onChange={(e) =>
                    updateField("contactExtension", e.target.value)
                  }
                  placeholder="Optionnel"
                  style={inputStyle}
                />
              </Field>
            </Section>

            <Section
              title="Colis"
              subtitle="Décrivez ce qui doit être transporté."
            >
              <Field label="Type de colis *">
                <div style={choiceGridStyle}>
                  <ChoiceCard
                    selected={form.packageType === "box"}
                    onClick={() =>
                      updateField("packageType", "box")
                    }
                    title="Boîte"
                    description="Colis ou boîte individuelle."
                  />

                  <ChoiceCard
                    selected={form.packageType === "pallet"}
                    onClick={() =>
                      updateField("packageType", "pallet")
                    }
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
                    value={form.quantity}
                    onChange={(e) =>
                      updateField("quantity", e.target.value)
                    }
                    style={inputStyle}
                  />
                </Field>

                <Field label="Poids total *">
                  <div style={inlineInputStyle}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.weight}
                      onChange={(e) =>
                        updateField("weight", e.target.value)
                      }
                      placeholder="Ex. 125"
                      style={{
                        ...inputStyle,
                        borderRadius: "12px 0 0 12px",
                      }}
                    />

                    <select
                      value={form.weightUnit}
                      onChange={(e) =>
                        updateField("weightUnit", e.target.value)
                      }
                      style={unitSelectStyle}
                    >
                      <option value="lb">lb</option>
                      <option value="kg">kg</option>
                    </select>
                  </div>
                </Field>
              </div>

              <div style={dimensionsBoxStyle}>
                <div>
                  <h3 style={smallTitleStyle}>
                    Dimensions
                  </h3>

                  <p style={helperStyle}>
                    Optionnel
                  </p>
                </div>

                <div style={dimensionsGridStyle}>
                  <Field label="Longueur">
                    <input
                      type="number"
                      min="0"
                      value={form.length}
                      onChange={(e) =>
                        updateField("length", e.target.value)
                      }
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Largeur">
                    <input
                      type="number"
                      min="0"
                      value={form.width}
                      onChange={(e) =>
                        updateField("width", e.target.value)
                      }
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Hauteur">
                    <input
                      type="number"
                      min="0"
                      value={form.height}
                      onChange={(e) =>
                        updateField("height", e.target.value)
                      }
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Unité">
                    <select
                      value={form.dimensionUnit}
                      onChange={(e) =>
                        updateField("dimensionUnit", e.target.value)
                      }
                      style={inputStyle}
                    >
                      <option value="in">Pouces</option>
                      <option value="cm">Centimètres</option>
                    </select>
                  </Field>
                </div>
              </div>
            </Section>

            <Section
              title="Date du ramassage"
              subtitle="Choisissez quand Glory Solutions doit effectuer le ramassage."
            >
              <div style={choiceGridThreeStyle}>
                <ChoiceCard
                  selected={form.dateChoice === "today"}
                  onClick={() =>
                    updateField("dateChoice", "today")
                  }
                  title="Aujourd’hui"
                  description="Ramassage le jour même."
                />

                <ChoiceCard
                  selected={form.dateChoice === "tomorrow"}
                  onClick={() =>
                    updateField("dateChoice", "tomorrow")
                  }
                  title="Demain"
                  description="Ramassage le lendemain."
                />

                <ChoiceCard
                  selected={form.dateChoice === "custom"}
                  onClick={() =>
                    updateField("dateChoice", "custom")
                  }
                  title="Autre date"
                  description="Choisir une date précise."
                />
              </div>

              {form.dateChoice === "custom" && (
                <div style={{ marginTop: "18px" }}>
                  <Field label="Date">
                    <input
                      type="date"
                      value={form.customDate}
                      onChange={(e) =>
                        updateField("customDate", e.target.value)
                      }
                      style={inputStyle}
                    />
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
                value={`${form.pickupAddress}${
                  form.pickupUnit
                    ? ` — ${form.pickupUnit}`
                    : ""
                }`}
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
                value={`${
                  form.packageType === "pallet"
                    ? "Palette"
                    : "Boîte"
                } × ${form.quantity}`}
              />

              <SummaryRow
                label="Poids"
                value={`${form.weight} ${form.weightUnit}`}
              />

              {(form.length ||
                form.width ||
                form.height) && (
                <SummaryRow
                  label="Dimensions"
                  value={`${form.length || "-"} × ${
                    form.width || "-"
                  } × ${form.height || "-"} ${
                    form.dimensionUnit
                  }`}
                />
              )}

              <SummaryRow
                label="Date"
                value={
                  form.dateChoice === "today"
                    ? "Aujourd’hui"
                    : form.dateChoice === "tomorrow"
                    ? "Demain"
                    : form.customDate
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