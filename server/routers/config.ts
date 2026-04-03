import { z } from "zod";
import { tenantAdminProcedure, tenantProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";

/**
 * ============================================================================
 * CONFIGURATION ROUTER
 * ============================================================================
 *
 * Handles survey types, questions, and other tenant configuration.
 */

// ============================================================================
// TYPES & VALIDATION
// ============================================================================

const CREATE_SURVEY_TYPE_SCHEMA = z.object({
  nome: z.string().min(1),
  descricao: z.string().optional(),
});

const CREATE_QUESTION_SCHEMA = z.object({
  tipoPesquisaId: z.string(),
  pergunta: z.string().min(1),
  tipo: z.enum(["escala", "multipla_escolha", "aberta"]),
  ordem: z.number().int().min(1),
});

// ============================================================================
// ROUTER PROCEDURES
// ============================================================================

export const configRouter = router({
  /**
   * Get all survey types for tenant
   */
  getSurveyTypes: tenantProcedure.query(async ({ ctx }) => {
    // TODO: Implement survey types retrieval
    return [];
  }),

  /**
   * Create new survey type (admin only)
   */
  createSurveyType: tenantAdminProcedure
    .input(CREATE_SURVEY_TYPE_SCHEMA)
    .mutation(async ({ ctx, input }) => {
      const { tenantId } = ctx.tenant;

      try {
        const tipoPesquisaId = randomUUID();
        // TODO: Insert into database
        return {
          id: tipoPesquisaId,
          nome: input.nome,
          descricao: input.descricao,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create survey type",
        });
      }
    }),

  /**
   * Get questions for survey type
   */
  getQuestions: tenantProcedure
    .input(z.object({ tipoPesquisaId: z.string() }))
    .query(async (_) => {
      // TODO: Implement questions retrieval
      // Validate tenant access
      return [];
    }),

  /**
   * Create new question (admin only)
   */
  createQuestion: tenantAdminProcedure
    .input(CREATE_QUESTION_SCHEMA)
    .mutation(async ({ ctx, input }) => {
      const { tenantId } = ctx.tenant;

      try {
        const perguntaId = randomUUID();
        // TODO: Insert into database
        return {
          id: perguntaId,
          ...input,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create question",
        });
      }
    }),

  /**
   * Update question (admin only)
   */
  updateQuestion: tenantAdminProcedure
    .input(
      z.object({
        perguntaId: z.string(),
        pergunta: z.string().optional(),
        tipo: z.enum(["escala", "multipla_escolha", "aberta"]).optional(),
        ordem: z.number().int().optional(),
        ativa: z.boolean().optional(),
      })
    )
    .mutation(async (_) => {
      // TODO: Implement question update
      // Validate tenant access
      return { success: true };
    }),

  /**
   * Delete question (admin only)
   */
  deleteQuestion: tenantAdminProcedure
    .input(z.object({ perguntaId: z.string() }))
    .mutation(async (_) => {
      // TODO: Implement question deletion
      // Validate tenant access
      return { success: true };
    }),
});
