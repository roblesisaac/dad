import { params } from "@ampt/sdk";
import fs from "fs";

import notify from "../utils/notify";
import { proper, randomNumber } from "../../src/utils";
import Users from "../models/users";

const { 
    APP_NAME,
    AMPT_URL,
} = params().list();

const appName = proper(APP_NAME);
const png = fs.readFileSync("./logo.png", "binary");
const base64 = Buffer.from(png, "binary").toString("base64");
const logoImage = `data:image/png;base64,${base64}`;

const template = `
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ${appName}</title>
  </head>
  <body style="background-color: #F8F8F8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 14px; line-height: 1.5;">
    <div style="max-width: 600px; margin: 20px auto;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse;">
        <tr>
          <td style="padding: 20px; background-color: #FFFFFF; text-align: center;">
          <img src="${logoImage}" alt="${appName}_LOGO" style="display: block; max-width: 50%; height: auto; margin: 0 auto 20px auto;" />
            <h1 style="font-size: 24px; margin-bottom: 10px;">Welcome to ${appName}!</h1>
            <p style="font-size: 16px; margin-bottom: 20px;">Thank you for joining our community. We are thrilled to have you with us.</p>

            <p v-if="message" v-html="message"></p>

            <b v-if="email_verified!==true">Please login and use the code below to verify your account.</b>
            <h1 v-if="email_verified!==true" style="fontWeight:bold;">{{ email_verified }}</h1>
            Start by logging in <a href="${AMPT_URL}/verify">here</a>.
          </td>
        </tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse;">
        <tr>
          <td style="padding: 20px; background-color: #FFFFFF; text-align: center;">
            <p style="font-size: 12px; margin-bottom: 10px;">To unsubscribe, please click <a href="${AMPT_URL}/unsubscribe" style="color: #0078FF;">here</a>.</p>
            <p style="font-size: 12px; margin-bottom: 10px;">For more information, visit our website <a href="${AMPT_URL}" style="color: #0078FF;">here</a>.</p>
            <p style="font-size: 12px;">${appName} © ${new Date().getFullYear()}</p>
          </td>
        </tr>
      </table>
    </div>
  </body>
</html>`;

const accountRemovedTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Farewell from ${appName}</title>
</head>
<body>
    <p>Thank you for signing up to ${appName}!</p>
    <p>Your Account has been removed.</p>
    <p>If this was a mistake, please click the button below to signup again:</p>
    <p><a href="${AMPT_URL}/login" style="display:inline-block;background-color:#007bff;color:#fff;font-weight:bold;font-size:16px;padding:12px 24px;border-radius:4px;text-decoration:none;">Signup »</a></p>
</body>
</html>`;

export async function sendVerificationCode(email, { subject, data }) {
  const email_verified = randomNumber();
  const templateData = {
    email_verified,
    message: false,
    ...data
  };  

  await Users.update({ email }, { email_verified });
  
  return notify.email(email, {
    subject: subject || "Here is your verification code",
    data: templateData,
    template
  });
}

async function fetchUserFromEvent(body, eventName) {
  const { email } = body;
  
  const user = await Users.findOne({ email });

  if(!user) {
    console.log(`${email} not found while running '${eventName}' event.`);
    return;
  }

  if(user.email_verified === true) {
    return;
  }

  return user;
}

async function firstCheck(body, events) {
  const user = await fetchUserFromEvent(body, 'firstCheck');
  if(!user) return;

  await sendVerificationCode(user.email, {
    subject: 'Verification Still Needed',
    data: {
      message: "<b>Your Account is about to be removed.</b>"
    }
  });

  events.publish('user.finalCheck', { after: '24 hours' }, body);
  console.log(`First check and '${user.email}' has not been verified yet...`)
}

async function finalCheck({ body }) {
  const user = await fetchUserFromEvent(body, 'finalCheck');
  if(!user) return;

  const { email } = user;

  await Users.remove({ email });
  await notify.email(email, {
    subject: `Your ${appName} Account Has Been Removed`,
    template: accountRemovedTemplate
  });

  console.log(`${ email } was never verified`);
}

async function userJoined(body, events) {
  const { email, email_verified } = body;

  if(email_verified === true) {
    const message = 'Congratulations! Your account has been successfully created.';

    return notify.email(email, {
        subject: 'Thanks for signing up!',
        data: { email_verified, message },
        template
    });
  }

  await sendVerificationCode(email, {
  subject: 'Thank you for signing up! Here is your verification code.'
  });

  events.publish('user.firstCheck', { after: '24 hours' }, body);
}

export async function userEvents(events) {
  events.on("user.firstCheck", ({ body }) => firstCheck(body, events));  
  events.on("user.finalCheck", finalCheck);
  events.on("users.saved", ({ body }) => userJoined(body, events));
}