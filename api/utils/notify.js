import { params } from "@ampt/sdk"
import nodemailer from "nodemailer";
import { createSSRApp} from "vue";
import { renderToString } from "@vue/server-renderer";
import inlineBase64 from "nodemailer-plugin-inline-base64";

import { proper } from "../../src/utils";

const { GMAIL_USERNAME, GMAIL_SECRET, APP_NAME } = params().list();

async function email(to, payload) {
  try {

    const { subject, data, template } = payload;
    
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USERNAME,
        pass: GMAIL_SECRET,
      }
    });

    const app = createSSRApp({
      template,
      setup: () => data || {}
    });
    
    const html = await renderToString(app);

    transporter.use('compile', inlineBase64());
    
    const mailOptions = {
      from: `${ proper(APP_NAME) }  <${ GMAIL_USERNAME }>`,
      to: to || 'dev@tracktabs.com',
      subject,
      html
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error(error);
  }
}

export default {
  email
}