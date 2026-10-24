import type mongoose from "mongoose";
import { ConflictError } from "@/lib/api-helpers";
import { assertExists, changedRef, collectionRoutes, itemRoutes, type CrudOptions } from "@/lib/crud";
import { invoiceDef } from "@/lib/entities";
import { invoiceTotals, paidAmount, PAYMENT_TOLERANCE, type InvoiceLine, type PaymentEntry } from "@/lib/finance";
import { getSettings, nextNumber } from "@/lib/server-settings";
import { Contact } from "@/models/Contact";
import { Invoice } from "@/models/Invoice";
import { Project } from "@/models/Project";
import { PurchaseOrder } from "@/models/PurchaseOrder";

type AnyModel = mongoose.Model<Record<string, unknown>>;

export const invoiceOptions: CrudOptions = {
  model: Invoice, def: invoiceDef, filters: ["kind", "state", "projectId", "partyContactId", "purchaseOrderId"], searchFields: ["number", "partyName", "partyReference"], sort: { date: -1, createdAt: -1 }, limit: 3000,
  prepare: async (data, { existing }) => {
    await assertExists(Contact as unknown as AnyModel, changedRef(data, existing, "partyContactId"), "client or supplier");
    await assertExists(Project as unknown as AnyModel, changedRef(data, existing, "projectId"), "project");
    await assertExists(PurchaseOrder as unknown as AnyModel, changedRef(data, existing, "purchaseOrderId"), "purchase order");
    if (existing) {
      data.kind = existing.kind; // the type is fixed once numbered
      data.state = existing.state;
    } else {
      const settings = await getSettings();
      data.number = await nextNumber(data.kind === "payable" ? "bill" : "invoice", settings);
      data.state = data.state === "draft" ? "draft" : "issued";
      data.payments = [];
    }
    const totals = invoiceTotals((data.items as InvoiceLine[]) || [], Number(data.retentionAmount || 0));
    const paid = paidAmount(((existing?.payments as PaymentEntry[]) || []));
    if (existing && totals.total + PAYMENT_TOLERANCE < paid) throw new ConflictError(`Payments of ${paid.toLocaleString("en-IN")} are already recorded, which is more than the new total. Remove a payment first if it was recorded by mistake.`);
    data.total = totals.total;
    data.paid = paid;
    return data;
  },
  guardEdit: (existing) => { if (existing.state === "void") throw new ConflictError("Void documents are kept as a record and cannot be edited."); },
  guardDelete: (existing) => {
    if (existing.state !== "draft") throw new ConflictError("Issued invoices and bills are kept for your accounts. Void it instead of deleting.");
  },
  describe: (doc) => `${doc.number || ""} ${doc.partyName || ""}`,
};

export const invoiceRoutes = { list: collectionRoutes(invoiceOptions), item: itemRoutes(invoiceOptions) };
