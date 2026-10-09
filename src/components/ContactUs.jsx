import React, { useRef } from "react";
import emailjs from "@emailjs/browser";
import "./ContactUs.css";

const ContactUs = () => {
  const form = useRef();

  const sendEmail = (e) => {
    e.preventDefault();

    emailjs
      .sendForm(
        "YOUR_SERVICE_ID",
        "YOUR_TEMPLATE_ID",
        form.current,
        "YOUR_PUBLIC_KEY"
      )
      .then(() => {
        alert("Message sent successfully!");
        form.current.reset();
      })
      .catch(() => {
        alert("Failed to send message.");
      });
  };

  // 🔥 Direction Link
  const openDirections = () => {
    window.open(
      "https://www.google.com/maps/dir/?api=1&destination=Mahua+Madhoul+Chowk+Muzaffarpur+Bihar+844122",
      "_blank"
    );
  };

  return (
    <div className="contact-container">

      {/* Address + Map */}
      <div className="contact-info">
        <h2>Contact Us</h2>

        <h3>Address:</h3>
        <p>
            <strong>A & A Home Decor</strong> <br/><br/>
          <b>Madhoul Chowk, Mahua</b> 
          <br />Mahua - Muzaffarpur Road,  Madhaul Chowk, Mahua,<br />
          
          Bihar 844122 , Mob: +91 8305961384
        </p>

        <iframe
          title="Google Map"
          src="https://www.google.com/maps?q=Mahua,+Madhoul+chowk,+Muzaffarpur+-+Mahua+Rd,+Madhaul+chowk,+Mahua,+Bihar+844122&output=embed"
          width="100%"
          height="300"
          style={{ border: 0, borderRadius: "10px" }}
          loading="lazy"
        ></iframe>

        {/* Direction Button */}
        <button className="direction-btn" onClick={openDirections}>
          📍 Get Directions
        </button>
      </div>

      {/* Form */}
      <div className="contact-form">
        <h2>Send Message</h2>

        <form ref={form} onSubmit={sendEmail}>
          <input type="text" name="user_name" placeholder="Your Name" required />
          <input type="tel" name="user_mobile" placeholder="Mobile Number" required />
          <textarea name="message" placeholder="Your Message" rows="5" required></textarea>
          <button type="submit">Send Message</button>
        </form>
      </div>

    </div>
  );
};

export default ContactUs;