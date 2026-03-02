const nodemailer = require('nodemailer');

const sendEmail = async(name,email,template)=>{
    
    // Return early without sending email
    return {
        success: true,
        message: 'Email functionality is disabled',
        note: 'OTP not sent - feature disabled',
        recipient: email,
        name: name
    };
    
    // The code below is commented out and won't execute
    /*
    let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'pankajtech1234@gmail.com',
        pass: process.env.NODE_MAILER_PASS
      },
    });
    
    let mailOptions = {
      from: `approval-ae <`,
      to: `${email}`,
      subject: `hello ${name || 'user'} `,
      text: 'Hello world?',
      html: template,
    };
    
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return console.log(error);
      }
    });
    */
}

module.exports = sendEmail;