import { z } from "zod";
import { tenantProcedure, publicProcedure, router } from "../_core/trpc.js";
import * as db from "../db.js";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";

/**
 * ============================================================================
 * SURVEYS ROUTER
 * ============================================================================
 *
 * Handles survey management, responses, and public survey access via token.
 */

// ============================================================================
// TYPES & VALIDATION
// ============================================================================

const SURVEY_RESPONSE_SCHEMA = z.object({
  perguntaId: z.string(),
  resposta: z.string(),
  score: z.number().int().min(1).max(10).optional(),
});

const SUBMIT_SURVEY_SCHEMA = z.object({
  token: z.string(),
  respostas: z.array(SURVEY_RESPONSE_SCHEMA),
});

// ============================================================================
// ROUTER PROCEDURES
// ============================================================================

export const surveysRouter = router({
  /**
   * Get survey by token (public access)
   * Returns survey details and associated questions
   */
  getSurveyByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const { token } = input;

      try {
        // Get survey
        const pesquisa = await db.getPesquisaByToken(token);
        if (!pesquisa) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Survey not found or has expired",
          });
        }

        // Check if already answered
        if (pesquisa.respondida) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This survey has already been answered",
          });
        }

        // Check if expired
        if (pesquisa.expiraEm && new Date() > pesquisa.expiraEm) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This survey has expired",
          });
        }

        // Get questions
        const perguntas = await db.getPerguntasByTipoPesquisa(pesquisa.tipoPesquisaId);

        return {
          id: pesquisa.id,
          token: pesquisa.token,
          tipoPesquisaId: pesquisa.tipoPesquisaId,
          perguntas,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve survey",
        });
      }
    }),

  /**
   * Submit survey responses (public access)
   * Saves all responses and marks survey as answered
   */
  submitResponses: publicProcedure
    .input(SUBMIT_SURVEY_SCHEMA)
    .mutation(async ({ input }) => {
      const { token, respostas } = input;

      try {
        // Get survey
        const pesquisa = await db.getPesquisaByToken(token);
        if (!pesquisa) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Survey not found",
          });
        }

        if (pesquisa.respondida) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Survey already answered",
          });
        }

        // Save responses
        for (const resposta of respostas) {
          const respostaId = await db.createResposta(
            pesquisa.tenantId,
            pesquisa.id,
            resposta.perguntaId,
            resposta.resposta,
            resposta.score
          );

          if (!respostaId) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to save response",
            });
          }
        }

        // Mark survey as answered
        const marked = await db.markPesquisaAsAnswered(pesquisa.id);
        if (!marked) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to mark survey as answered",
          });
        }

        return {
          success: true,
          message: "Thank you for your feedback!",
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to submit survey responses",
        });
      }
    }),

  /**
   * Get all surveys for tenant (paginated)
   */
  listSurveys: tenantProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        respondidas: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // TODO: Implement survey listing with pagination
      // This would require additional database queries
      return {
        surveys: [],
        total: 0,
        page: input.page,
        limit: input.limit,
      };
    }),

  /**
   * Get survey details with responses
   */
  getSurveyDetails: tenantProcedure
    .input(z.object({ pesquisaId: z.string() }))
    .query(async ({ ctx, input }) => {
      // TODO: Implement survey details retrieval
      // Validate tenant access to survey
      return null;
    }),

  /**
   * Get survey statistics for tenant
   */
  getStatistics: tenantProcedure.query(async ({ ctx }) => {
    // TODO: Implement statistics calculation
    return {
      totalSurveys: 0,
      respondedSurveys: 0,
      responseRate: 0,
      averageScore: 0,
    };
  }),
});
