const functions = require("firebase-functions");

const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const axios = require("axios");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const { CourierClient } = require("@trycourier/courier");

initializeApp();
const db = getFirestore();

async function checkWebsite(url, xpath, textToMatch) {
  try {
    const res = await axios.get(url);
    const html = res.data;
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // get an element from the xpath
    const element = document.evaluate(xpath, document, null, dom.window.XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue

    if (element) {
      const elementText = element.textContent.trim();
      if (elementText.toLowerCase() === textToMatch.toLowerCase()) {
        // if the element text matches
        return { change: false };
      } else {
        // if the element text does not match
        return { change: true };
      }
    } else {
      // if the element does not exist
      return { change: true };
    }
  } catch (error) {
    functions.logger.error(error);
    return { error: error };
  }
}

async function sendNotification(courier, url, label, textToMatch) {
  const { requestId } = await courier.send({
    message: {
      to: {
        email: process.env.EMAIL,
      },
      content: {
        title: `A change has been detected for job: ${label}`,
        body: `Visit this url: ${url}, to view the change, the text or element containing the text "${textToMatch}" could not be found/has changed.`,
      },
      routing: {
        method: "single",
        channels: ["email"],
      },
    },
  });

  return requestId;
}

// Use this http endpoint while testing to make sure the checker is functioning
// as normal, the code in here should be the same as the pubsub function
exports.testChecker = functions.https.onRequest(async (request, response) => {
  const courier = CourierClient({ authorizationToken: process.env.COURIER_API_KEY });

  const websitesRef = db.collection("websites");
  const snapshot = await websitesRef.get();

  snapshot.forEach(async (doc) => {
    const docData = doc.data();
    const url = docData.url;
    const xpath = docData.xpath;
    const textToMatch = docData.textToMatch;
    const change = docData.change;
    const label = docData.label;

    functions.logger.info(`Checking ${url} for a match, job label: ${label}`)
    const checkResult = await checkWebsite(url, xpath, textToMatch);

    if (checkResult.error) {
      functions.logger.error(checkResult.error);
    } else if (change !== checkResult.change) {
      // update the document to the new result change
      const docRef = websitesRef.doc(doc.id);
      await docRef.update({ change: checkResult.change });
      functions.logger.info(`A change has been detected for ${url}, job label: ${label}`);

      // send notification
      const notificationId = await sendNotification(courier, url, label, textToMatch);
      functions.logger.info(`Sent notification with ID ${notificationId}`);
    }
  });

  response.send({ success: true })
});

exports.addWebsite = functions.https.onRequest(async (request, response) => {
  const bodyData = request.body;
  functions.logger.info("Received request to add a new website");
  try {
    const docRef = await db.collection("websites").add({
      url: bodyData.url,
      xpath: bodyData.xpath,
      textToMatch: bodyData.textToMatch,
      label: bodyData.label,
      change: false
    });

    functions.logger.info(`Document written with ID: ${docRef.id}`);
    response.send(`Document written with ID: ${docRef.id}`);
  } catch (e) {
    functions.logger.error(e);
    response.send(e);
  }
});

exports.runChecker = functions.runWith({ memory: "1GB" }).pubsub
  .schedule("0 * * * *") // every hour
  .timeZone("Europe/London")
  .onRun(async () => {
    functions.logger.info("Started checker execution");

    const courier = CourierClient({ authorizationToken: process.env.COURIER_API_KEY });

    const websitesRef = db.collection("websites");
    const snapshot = await websitesRef.get();

    snapshot.forEach(async (doc) => {
      const docData = doc.data();
      const url = docData.url;
      const xpath = docData.xpath;
      const textToMatch = docData.textToMatch;
      const change = docData.change;
      const label = docData.label;

      functions.logger.info(`Checking ${url} for a match, job label: ${label}`)
      const checkResult = await checkWebsite(url, xpath, textToMatch);

      if (change !== checkResult.change) {
        // update the document to the new result change
        const docRef = websitesRef.doc(doc.id);
        await docRef.update({ change: checkResult.change });
        functions.logger.info(`A change has been detected for ${url}, job label: ${label}`);

        // send notification
        const notificationId = await sendNotification(courier, url, label);
        functions.logger.info(`Sent notification with ID ${notificationId}`);
      }
    });

    functions.logger.info("Ended checker execution");
  });