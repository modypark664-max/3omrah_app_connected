const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "Mailgun",
  auth: {
    user: process.env.MAILGUN_USER,
    pass: process.env.MAILGUN_PASS,
  },
});

const sendEmail = async (name, email, phoneNumber, message) => {
  const mailOptions = {
    from: "DevDou " + process.env.MAILGUN_USER,
    to: "devdou180@gmail.com",
    subject: "Incoming message",
    text: `لديك رسالة جديدة من ${name} (${email}، ${phoneNumber}): ${message}`,
    html: `<p>لديك رسالة جديدة من <strong>${name}</strong> (${email}، ${phoneNumber}):</p>
       <p>${message}</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending the email.", error);
  }
};

module.exports = { sendEmail };
