import nodemailer from "nodemailer";

/**
 * Configure seu provedor SMTP de email aqui.
 * Para produção, utilize variáveis de ambiente.
 */
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true" || false,
    auth: {
        user: process.env.SMTP_USER || "seu-email@gmail.com",
        pass: process.env.SMTP_PASS || "sua-senha-app",
    },
});

export async function sendApprovalRequestEmail(userEmail: string, userName: string) {
    const adminEmail = "devprojects566@gmail.com";
    // Em produção utilizar a URL correta do dashboard de aprovação (SuperAdmin)
    const approvalLink = `${process.env.VITE_APP_URL || "http://localhost:5173"}/superadmin`;

    const mailOptions = {
        from: `"IDExpSat Admin" <${process.env.SMTP_USER || "noreply@idexpsat.com"}>`,
        to: adminEmail,
        subject: `⚠️ Nova Solicitação de Acesso: ${userName || userEmail}`,
        html: `
      <h2>Nova solicitação de acesso à plataforma!</h2>
      <p>O usuário <strong>${userName || userEmail}</strong> (${userEmail}) definiu uma senha e está aguardando sua aprovação para acessar a aplicação.</p>
      <p>Clique no link abaixo para ir ao painel SuperAdmin e aprovar este acesso:</p>
      <a href="${approvalLink}" style="display:inline-block;padding:10px 20px;background-color:#0f172a;color:#ffffff;text-decoration:none;border-radius:5px;margin-top:20px;">
        Aprovar Acesso no Painel
      </a>
    `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Email de aprovação enviado: %s", info.messageId);
        return true;
    } catch (error) {
        console.error("Erro ao enviar email de aprovação:", error);
        // Para ambientes de desenvolvimento sem credenciais SMTP configuradas, 
        // não estourar erro fatal, apenas logar.
        return false;
    }
}
