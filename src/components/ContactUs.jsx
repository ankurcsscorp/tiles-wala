import React, { useState } from "react";
import api from "../api";
import "./ContactUs.css";

const API_URL = "http://localhost:4000/api/tiles/enquiries";
const DIRECTIONS_URL =
  "https://www.google.com/maps/dir/?api=1&destination=Mahua+Madhoul+Chowk+Muzaffarpur+Bihar+844122";
const initialForm = {
  name: "",
  mobile: "",
  address: "",
  area: "",
  purchasePlan: "",
  message: "",
};

const ContactUs = () => {
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitState, setSubmitState] = useState({
    type: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setSubmitState({ type: "", message: "" });
  };

  const validateForm = () => {
    const nextErrors = {};
    if (!formData.name.trim()) {
      nextErrors.name = "Name is required.";
    }
    if (!/^[6-9]\d{9}$/.test(formData.mobile.trim())) {
      nextErrors.mobile = "Enter a valid 10-digit Indian mobile number.";
    }
    if (!formData.address.trim()) {
      nextErrors.address = "Address is required.";
    }
    if (
      !formData.area.trim() ||
      !Number.isFinite(Number(formData.area)) ||
      Number(formData.area) <= 0
    ) {
      nextErrors.area = "Enter a valid area greater than zero.";
    }
    if (!formData.purchasePlan) {
      nextErrors.purchasePlan = "Select when you plan to purchase.";
    }
    if (!formData.message.trim()) {
      nextErrors.message = "Please tell us what you need.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitState({ type: "", message: "" });
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const response = await api.post(API_URL, {
        customer_name: formData.name.trim(),
        mobile: formData.mobile.trim(),
        address: formData.address.trim(),
        required_area: Number(formData.area),
        purchase_plan: formData.purchasePlan,
        remark: formData.message.trim(),
      });

      setSubmitState({
        type: "success",
        message: response.data?.message || "Your enquiry was sent successfully.",
      });
      setFormData({ ...initialForm });
      setErrors({});
    } catch (error) {
      console.error("Contact enquiry submission failed:", error);
      const message =
        error.response?.data?.message ||
        (error.response?.status
          ? `Request failed with status ${error.response.status}.`
          : error.request
            ? "Unable to connect to the server. Please try again when the connection is available."
            : error.message) ||
        "Unable to send your enquiry. Please try again.";
      setSubmitState({ type: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="contact-container">
      <section className="contact-info" aria-labelledby="contact-page-title">
        <h1 id="contact-page-title">Contact Us</h1>

        <h2>Visit our showroom</h2>
        <p>
          <strong>A &amp; A Home Decor</strong>
          <br />
          <br />
          <b>Madhoul Chowk, Mahua</b>
          <br />
          Mahua - Muzaffarpur Road, Madhaul Chowk, Mahua,
          <br />
          Bihar 844122
          <br />
          Mob: <a className="contact-phone-link" href="tel:+918305961384">+91 8305961384</a>
        </p>

        <iframe
          title="A & A Home Decor location map"
          src="https://www.google.com/maps?q=Mahua,+Madhoul+chowk,+Muzaffarpur+-+Mahua+Rd,+Madhaul+chowk,+Mahua,+Bihar+844122&output=embed"
          width="100%"
          height="300"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />

        <a
          className="direction-btn"
          href={DIRECTIONS_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Get directions to A & A Home Decor in Google Maps"
        >
          Get Directions
        </a>
      </section>

      <section className="contact-form" aria-labelledby="contact-form-title">
        <h2 id="contact-form-title">Send an Enquiry</h2>
        <p className="contact-form-intro">
          Tell us about your project. Our team will get back to you.
        </p>

        {submitState.message && (
          <p
            className={`contact-form-message is-${submitState.type}`}
            role={submitState.type === "error" ? "alert" : "status"}
          >
            {submitState.message}
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="contact-name">Your name</label>
          <input
            id="contact-name"
            type="text"
            name="name"
            autoComplete="name"
            maxLength={150}
            placeholder="Enter your name"
            value={formData.name}
            onChange={handleChange}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "contact-name-error" : undefined}
            required
          />
          {errors.name && <span id="contact-name-error" className="contact-field-error">{errors.name}</span>}

          <label htmlFor="contact-mobile">Mobile number</label>
          <div className="contact-mobile-field">
            <span aria-hidden="true">+91</span>
            <input
              id="contact-mobile"
              type="tel"
              name="mobile"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              placeholder="9876543210"
              value={formData.mobile}
              onChange={(event) => {
                const mobile = event.target.value.replace(/\D/g, "").slice(0, 10);
                handleChange({ target: { name: "mobile", value: mobile } });
              }}
              aria-invalid={Boolean(errors.mobile)}
              aria-describedby={errors.mobile ? "contact-mobile-error" : undefined}
              required
            />
          </div>
          {errors.mobile && <span id="contact-mobile-error" className="contact-field-error">{errors.mobile}</span>}

          <label htmlFor="contact-address">Address</label>
          <textarea
            id="contact-address"
            name="address"
            rows="2"
            maxLength={500}
            placeholder="Village, town or full address"
            value={formData.address}
            onChange={handleChange}
            aria-invalid={Boolean(errors.address)}
            aria-describedby={errors.address ? "contact-address-error" : undefined}
            required
          />
          {errors.address && <span id="contact-address-error" className="contact-field-error">{errors.address}</span>}

          <div className="contact-form-row">
            <div>
              <label htmlFor="contact-area">Area required (sq. ft.)</label>
              <input
                id="contact-area"
                type="number"
                name="area"
                min="0.1"
                step="any"
                inputMode="decimal"
                placeholder="e.g. 500"
                value={formData.area}
                onChange={handleChange}
                aria-invalid={Boolean(errors.area)}
                aria-describedby={errors.area ? "contact-area-error" : undefined}
                required
              />
              {errors.area && <span id="contact-area-error" className="contact-field-error">{errors.area}</span>}
            </div>
            <div>
              <label htmlFor="contact-purchase-plan">Purchase plan</label>
              <select
                id="contact-purchase-plan"
                name="purchasePlan"
                value={formData.purchasePlan}
                onChange={handleChange}
                aria-invalid={Boolean(errors.purchasePlan)}
                aria-describedby={
                  errors.purchasePlan ? "contact-purchase-plan-error" : undefined
                }
                required
              >
                <option value="">Select a timeframe</option>
                <option value="Immediate">Immediate</option>
                <option value="Less Than a Week">Less Than a Week</option>
                <option value="In 15 Days">In 15 Days</option>
                <option value="Less Than 30 Days">Less Than 30 Days</option>
                <option value="Greater Than 30 Days">Greater Than 30 Days</option>
              </select>
              {errors.purchasePlan && (
                <span id="contact-purchase-plan-error" className="contact-field-error">
                  {errors.purchasePlan}
                </span>
              )}
            </div>
          </div>

          <label htmlFor="contact-message">What are you looking for?</label>
          <textarea
            id="contact-message"
            name="message"
            rows="4"
            maxLength={1000}
            placeholder="For example: bathroom wall tiles, kitchen flooring..."
            value={formData.message}
            onChange={handleChange}
            aria-invalid={Boolean(errors.message)}
            aria-describedby={errors.message ? "contact-message-error" : undefined}
            required
          />
          {errors.message && <span id="contact-message-error" className="contact-field-error">{errors.message}</span>}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending enquiry..." : "Send Enquiry"}
          </button>
        </form>
      </section>
    </main>
  );
};

export default ContactUs;
