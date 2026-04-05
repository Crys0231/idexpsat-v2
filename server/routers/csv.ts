import { z } from "zod";
import { tenantProcedure, router } from "../_core/trpc.js";
import * as db from "../db.js";
import { TRPCError } from "@trpc/server";
import { sendSurveyWhatsAppNotification } from "../_core/whatsapp.js";

const CSV_UPLOAD_SCHEMA = z.object({
  filename: z.string().min(1, "Filename is required"),
  content: z.string().min(1, "CSV content is required"),
  tipoPesquisaString: z.enum(["VENDA", "POS_VENDA"]),
});


interface CSVRow {
  TELEFONE: string;
  NOME: string;
  CIDADE: string;
  MODELO: string;
  PLACA: string;
}

export interface ProcessingResult {
  totalRows: number;
  processedRows: number;
  errors: Array<{ row: number; error: string }>;
  pesquisasCreated: number;
}

function extractBrandFromFilename(filename: string): string {
  const name = filename.split(".")[0].toUpperCase();
  const knownBrands = [
    "HYUNDAI", "PEUGEOT", "CHERY", "VOLKSWAGEN", "CHEVROLET",
    "FORD", "OMODA", "RENAULT", "MITSUBISHI", "FIAT", "BMW",
    "AUDI", "MERCEDES", "TOYOTA", "HONDA", "NISSAN", "JEEP", "CITROËN",
  ];

  for (const brand of knownBrands) {
    if (name.includes(brand)) return brand;
  }

  return "DESCONHECIDA";
}

function cleanPhoneNumber(phone: string): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
}

function parseCSV(content: string): CSVRow[] {
  const lines = content.trim().split("\n");
  if (lines.length < 2) {
    throw new Error("CSV must have at least header and one data row");
  }

  const headers = lines[0].split(";").map((h) => h.trim().toUpperCase());
  const requiredHeaders = ["TELEFONE", "NOME", "CIDADE", "MODELO", "PLACA"];
  const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));

  if (missingHeaders.length > 0) {
    throw new Error(`Missing required headers: ${missingHeaders.join(", ")}`);
  }

  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(";").map((v) => v.trim());
    rows.push({
      TELEFONE: values[headers.indexOf("TELEFONE")] || "",
      NOME: values[headers.indexOf("NOME")] || "",
      CIDADE: values[headers.indexOf("CIDADE")] || "",
      MODELO: values[headers.indexOf("MODELO")] || "",
      PLACA: values[headers.indexOf("PLACA")] || "",
    });
  }

  return rows;
}

export const csvRouter = router({
  uploadAndProcess: tenantProcedure
    .input(CSV_UPLOAD_SCHEMA)
    .mutation(async ({ ctx, input }): Promise<ProcessingResult> => {
      const { tenantId } = ctx.tenant;
      const { filename, content, tipoPesquisaString } = input;

      try {
        const brand = extractBrandFromFilename(filename);

        let rows: CSVRow[];
        try {
          rows = parseCSV(content);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `CSV parsing error: ${error instanceof Error ? error.message : "Unknown error"}`,
          });
        }

        const result: ProcessingResult = {
          totalRows: rows.length,
          processedRows: 0,
          errors: [],
          pesquisasCreated: 0,
        };

        const brandId = await db.getOrCreateMarca(tenantId, brand);
        if (!brandId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create/get brand",
          });
        }

        const tipoPesquisaId = await db.getOrCreateTipoPesquisa(tenantId, tipoPesquisaString);
        if (!tipoPesquisaId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create/get survey type",
          });
        }

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rowNumber = i + 2;

          try {
            const telefone = cleanPhoneNumber(row.TELEFONE);
            const placa = row.PLACA?.toUpperCase().trim();

            if (!telefone || !placa) {
              result.errors.push({ row: rowNumber, error: "Missing phone or license plate" });
              continue;
            }

            const clienteId = await db.getOrCreateCliente(
              tenantId,
              telefone,
              row.NOME?.toUpperCase().trim() || "DESCONHECIDO",
              row.CIDADE?.toUpperCase().trim() || "DESCONHECIDA"
            );
            if (!clienteId) {
              result.errors.push({ row: rowNumber, error: "Failed to create/get client" });
              continue;
            }

            const veiculoId = await db.getOrCreateVeiculo(
              tenantId,
              placa,
              row.MODELO?.toUpperCase().trim() || "DESCONHECIDO",
              brandId
            );
            if (!veiculoId) {
              result.errors.push({ row: rowNumber, error: "Failed to create/get vehicle" });
              continue;
            }

            const compraId = await db.getOrCreateCompra(
              tenantId,
              clienteId,
              veiculoId,
              tipoPesquisaId,
              new Date()
            );
            if (!compraId) {
              result.errors.push({ row: rowNumber, error: "Failed to create purchase" });
              continue;
            }

            const pesquisa = await db.createPesquisa(tenantId, compraId, tipoPesquisaId);
            if (!pesquisa) {
              result.errors.push({ row: rowNumber, error: "Failed to create survey" });
              continue;
            }

            if (telefone) {
              const clientName = row.NOME?.trim() || "Cliente";
              sendSurveyWhatsAppNotification(telefone, pesquisa.token, clientName).catch(e => {
                console.error("Erro assincrono WhatsApp:", e);
              });
            }

            result.processedRows++;
            result.pesquisasCreated++;
          } catch (error) {
            result.errors.push({
              row: rowNumber,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }

        return result;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Unknown error during CSV processing",
        });
      }
    }),

  getHistory: tenantProcedure.query(async () => {
    return [];
  }),
});