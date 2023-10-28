const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const port = 5000;

app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB using Mongoose
mongoUrl =
  "mongodb+srv://faizanmd:faizan123@cluster0.defifv6.mongodb.net/invodatabase?retryWrites=true&w=majority";
mongoose.connect(mongoUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const InvoiceSchema = new mongoose.Schema({
  invoiceDate: String,
  invoiceNumber: Number,
  invoiceAmount: Number,
  financialYear: String,
});

const Invoice = mongoose.model("Invoice", InvoiceSchema);

// Your API endpoints
app.get("/", (req, res) => {
  res.send("Hello technokart");
});

// 1. Enter new invoice details
app.post("/api/invoices", async (req, res) => {
  // Implement validation logic here
  const { invoiceDate, invoiceNumber } = req.body;

  // Check if an invoice with the same number exists for the same financial year
  const existingInvoice = await Invoice.findOne({
    invoiceNumber,
    financialYear: getFinancialYear(invoiceDate),
  });

  if (existingInvoice) {
    return res.status(400).json({
      message: "Invoice number already exists for this financial year",
    });
  }

  // Find the previous invoice with the next lower number
  const previousInvoice = await Invoice.findOne({
    invoiceNumber: invoiceNumber - 1,
  });

  // Find the next invoice with the next higher number
  const nextInvoice = await Invoice.findOne({
    invoiceNumber: invoiceNumber + 1,
  });

  // Validate the invoice date against the previous and next invoices
  if (
    (previousInvoice &&
      new Date(invoiceDate) <= new Date(previousInvoice.invoiceDate)) ||
    (nextInvoice && new Date(invoiceDate) >= new Date(nextInvoice.invoiceDate))
  ) {
    return res
      .status(400)
      .json({ message: "Invoice date is not within the valid range." });
  }

  // Set the financialYear based on the invoiceDate
  req.body.financialYear = getFinancialYear(invoiceDate);

  const newInvoice = new Invoice(req.body);

  try {
    await newInvoice.save();
    res.status(201).json({ message: "Invoice created successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to create invoice", error: error });
  }
});

// Helper function to get the financial year
function getFinancialYear(invoiceDate) {
  const date = new Date(invoiceDate);
  const year = date.getFullYear();
  return `${year}-${year + 1}`;
}

// 4. Get all invoices stored in the db
app.get("/api/invoices", async (req, res) => {
  const { invoiceNumber } = req.query;

  if (invoiceNumber) {
    const invoices = await Invoice.find({ invoiceNumber });
    res.json(invoices);
  } else {
    const invoices = await Invoice.find({});
    res.json(invoices);
  }
});

// 2. Update a specific invoice based on invoice number
app.put("/api/invoices/:id", async (req, res) => {
  const { id } = req.params;
  const updatedInvoice = req.body;
  // You can add validation logic here if needed
  await Invoice.findOneAndUpdate({ id }, updatedInvoice);
  res.json(updatedInvoice);
});

// 3. Delete a specific invoice based on invoice number
app.delete("/api/invoices/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedInvoice = await Invoice.findByIdAndDelete(id);
    if (!deletedInvoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    res.status(200).json({ message: "Invoice deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete invoice", error: error });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
