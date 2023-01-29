[Google Firebase](https://firebase.google.com/):

- [**Functions**](https://firebase.google.com/docs/functions/get-started/) for repeated website scraping
- [**Firestore**](https://firebase.google.com/docs/firestore/quickstore/) for a database containing websites needing scraped
- Will scrape a website, using jsdom, looking at the element that is specified by an xpath, checking for either a change in element text, deletion of the element or creation of the element (can expand to increase or decrease of number, for e.g. price)
- Will store scraping job details in a database

[Vercel](https://vercel.com/):

- To host the [Next.js](https://nextjs.org/) website
- Will have the ability to view current scraping jobs, as well as add more jobs by entering a job name, url, xpath for element to be checked, and the type of check to be performed on the element

[Courier](https://www.courier.com/):

- Can select multiple notification channels, e.g. mobile notifications, emails, etc
- Free up to 10,000 notifications per month

Functions commands:

```
mkdir functions
cd functions
npm install firebase-functions@latest firebase-admin@latest --save
firebase login
firebase init functions (create project beforehand on firebase console website, select use an existing project and the project you just created)
firebase init firestore (setup firestore on firebase console website first, use default settings for command)
cd functions
npm install axios jsdom @trycourier/courier
npm run serve
npm run deploy
```
