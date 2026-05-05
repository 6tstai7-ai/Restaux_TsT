export type CampaignState = "none" | "draft" | "sent";
export type DashboardHealthStatus = "critical" | "attention" | "ready" | "success";
export type DashboardPriorityLevel = "critical" | "high" | "normal" | "low";

export type DashboardDecisionInput = {
  hasRestaurant: boolean;
  metricsLoading: boolean;
  metricsError: string | null;
  totalCustomers: number;
  totalSmsOptIns?: number | null;
  recentCustomerCount: number;
  generatedSms: string | null;
  sendStatus: "idle" | "sending" | "sent" | "error";
  sendError: string | null;
};

export type DashboardDecision = {
  healthStatus: DashboardHealthStatus;
  priorityLevel: DashboardPriorityLevel;
  campaignState: CampaignState;
  statusLabel: string;
  headline: string;
  explanation: string;
  urgentAlerts: string[];
  nextAction: string;
};

export function deriveDashboardDecision(input: DashboardDecisionInput): DashboardDecision {
  if (input.metricsLoading) {
    return {
      healthStatus: "attention",
      priorityLevel: "normal",
      campaignState: getCampaignState(input),
      statusLabel: "Analyse en cours",
      headline: "Lecture de la situation du jour",
      explanation: "Restaux rassemble les signaux disponibles avant de recommander la prochaine action.",
      urgentAlerts: [],
      nextAction: "Attendre la fin du chargement."
    };
  }

  if (input.metricsError) {
    return {
      healthStatus: "attention",
      priorityLevel: "high",
      campaignState: getCampaignState(input),
      statusLabel: "Lecture différée",
      headline: "Les indicateurs ne sont pas à jour pour l'instant",
      explanation: "Restaux n'a pas pu rafraîchir les données du restaurant. Vos informations sont en sécurité.",
      urgentAlerts: ["Réessayer la lecture dans un instant."],
      nextAction: "Cliquer sur Réessayer ou recharger la page si le problème persiste."
    };
  }

  if (!input.hasRestaurant) {
    return {
      healthStatus: "critical",
      priorityLevel: "critical",
      campaignState: getCampaignState(input),
      statusLabel: "Configuration requise",
      headline: "Aucun restaurant n'est encore configuré",
      explanation: "Le tableau de bord a besoin d'un restaurant pour suivre les clients, les points et les campagnes.",
      urgentAlerts: ["Créer le restaurant pilote avant de lancer les opérations."],
      nextAction: "Générer la première campagne créera le restaurant pilote si la session est valide."
    };
  }

  if (input.totalCustomers === 0) {
    return {
      healthStatus: "attention",
      priorityLevel: "high",
      campaignState: getCampaignState(input),
      statusLabel: "Base à construire",
      headline: "La base clients est vide",
      explanation: "Sans clients inscrits, aucune campagne SMS ne peut créer de trafic aujourd'hui.",
      urgentAlerts: ["Ajouter des clients ou partager le lien d'inscription public."],
      nextAction: "Ouvrir Clients et inscrire les premiers clients avec consentement SMS."
    };
  }

  if (input.totalSmsOptIns === 0) {
    return {
      healthStatus: "attention",
      priorityLevel: "high",
      campaignState: getCampaignState(input),
      statusLabel: "Consentement manquant",
      headline: "Aucun client n'est joignable par SMS",
      explanation: "La base existe, mais Restaux ne détecte aucun consentement SMS disponible.",
      urgentAlerts: ["Obtenir un consentement explicite avant d'envoyer une campagne."],
      nextAction: "Faire confirmer le consentement SMS lors des prochaines inscriptions."
    };
  }

  if (input.sendStatus === "error") {
    return {
      healthStatus: "critical",
      priorityLevel: "critical",
      campaignState: getCampaignState(input),
      statusLabel: "Envoi bloqué",
      headline: "La campagne n'a pas pu être envoyée",
      explanation: "La campagne est prête, mais l'envoi SMS demande une correction.",
      urgentAlerts: [input.sendError ?? "Erreur d'envoi SMS."],
      nextAction: "Corriger l'erreur puis relancer l'envoi."
    };
  }

  if (input.generatedSms && input.sendStatus !== "sent") {
    return {
      healthStatus: "ready",
      priorityLevel: "high",
      campaignState: "draft",
      statusLabel: "Action prête",
      headline: "Une campagne est prête à envoyer",
      explanation: "Le message IA est généré. Il reste à l'approuver et à l'envoyer aux clients opt-in.",
      urgentAlerts: ["Campagne générée en attente d'envoi."],
      nextAction: "Relire le SMS, puis envoyer la promotion."
    };
  }

  if (input.sendStatus === "sent") {
    return {
      healthStatus: "success",
      priorityLevel: "low",
      campaignState: "sent",
      statusLabel: "Journée lancée",
      headline: "La campagne du jour est envoyée",
      explanation: "Les clients opt-in ont été contactés. Le prochain signal important est l'enregistrement des visites.",
      urgentAlerts: [],
      nextAction: "Scanner les visites au comptoir pour tenir les points à jour."
    };
  }

  return {
    healthStatus: "ready",
    priorityLevel: "normal",
    campaignState: "none",
    statusLabel: "Prêt pour aujourd'hui",
    headline: "La prochaine décision est la campagne du jour",
    explanation: "La base clients existe. Il faut maintenant transformer les surplus du jour en action concrète.",
    urgentAlerts: input.recentCustomerCount === 0 ? ["Aucun nouveau client récent à relancer."] : [],
    nextAction: "Répondre à l'audit des surplus et générer la campagne IA."
  };
}

function getCampaignState(input: DashboardDecisionInput): CampaignState {
  if (input.sendStatus === "sent") return "sent";
  if (input.generatedSms) return "draft";
  return "none";
}
