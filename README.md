# Node.js E-commerce Demo Website

This repository contains the code for a demonstration website created with Node.js. The website allows users to browse and add products, but please note that it is for demonstration purposes only.

## Technologies Used
- Node.js: JavaScript runtime environment.
- Express.js: Web application framework for Node.js.
- MVC (Model-View-Controller) architecture: Organizing code structure.
- HTML, JavaScript, CSS: Front-end development technologies.
- MongoDB: NoSQL database for data storage.
- AWS S3: Cloud storage service for image storage.
- SendGrid: Email delivery service for password reset emails.
- Stripe: Payment processing platform (for testing purposes).

## Getting Started
To run the website on your local machine, please follow these steps:

1. Make sure you have Node.js installed.
2. Clone this repository to your local machine.
3. Navigate to the project directory.
4. Install the required dependencies by running `npm install`.
5. In the package.json file, under the "scripts" section, locate the "start" command.
6. Update the command to include your own environmental variables for AWS, MongoDB, Stripe, and SendGrid. The command should look like this:

"start": "SET NODE_ENV=production & SET AWS_KEY=your-aws-key & SET AWS_SECRET=your-aws-secret & SET MONGO_USER=your-mongo-user & SET MONGO_PASSWORD=your-mongo-password & SET MONGO_DEFAULT_DATABASE=shop & SET STRIPE_KEY=your-stripe-key & SET SEND_GRID=your-sendgrid-key & node app.js"

Make sure to replace `your-aws-key`, `your-aws-secret`, `your-mongo-user`, `your-mongo-password`, `your-stripe-key`, and `your-sendgrid-key` with your own credentials.

7. Save the package.json file.
8. Start the server by running `npm start` in your terminal.
9. Access the website locally by visiting `https://localhost:3000`.

Feel free to explore the code and customize it to fit your needs. If you have any questions or need further assistance, please don't hesitate to reach out.

## Live Demo
You can also access a live demo version of this website at [https://nodejsmdias23.onrender.com/](https://nodejsmdias23.onrender.com/).

Please note that the live demo may have limited functionality or may not reflect the latest changes made to the code.

## Contact
If you have any questions, feedback, or suggestions, you can reach out to me:

- Email: mldias23i@gmail.com
- LinkedIn: [Your LinkedIn Profile](https://www.linkedin.com/in/mldias23/)
