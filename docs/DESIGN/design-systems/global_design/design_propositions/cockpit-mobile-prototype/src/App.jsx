import { useEffect, useMemo, useRef, useState } from "react";

const WEEK_DAYS = [
  {
    key: "mon",
    label: "Lun",
    dateNumber: "22",
    count: 2,
    items: [
      {
        id: "mon-1",
        moment: "09:15",
        type: "RDV",
        title: "Point de calage staffing",
        context: "Generali · besoin Lead Data Engineer",
        route: "/staffing",
      },
      {
        id: "mon-2",
        moment: "16:30",
        type: "Tache",
        title: "Mettre a jour le plan de relance",
        context: "Prospection · comptes Assurance",
        route: "/prospection/suivi",
      },
    ],
  },
  {
    key: "tue",
    label: "Mar",
    dateNumber: "23",
    count: 4,
    items: [
      {
        id: "tue-1",
        moment: "08:45",
        type: "Priorite",
        title: "Valider la shortlist Data Engineer",
        context: "Credit Agricole · staffing critique",
        route: "/staffing",
      },
      {
        id: "tue-2",
        moment: "10:00",
        type: "RDV",
        title: "Cadrage programme cloud",
        context: "AXA Group · atelier missions",
        route: "/missions/opps",
      },
      {
        id: "tue-3",
        moment: "13:30",
        type: "Tache",
        title: "Relancer les CV envoyes",
        context: "Societe Generale · opportunite Data",
        route: "/staffing",
      },
      {
        id: "tue-4",
        moment: "J-0",
        type: "Echeance",
        title: "Envoyer la synthese des echanges",
        context: "L'Oreal · prospection grand compte",
        route: "/prospection/suivi",
      },
    ],
  },
  {
    key: "wed",
    label: "Mer",
    dateNumber: "24",
    count: 3,
    items: [
      {
        id: "wed-1",
        moment: "09:00",
        type: "RDV",
        title: "Comite de cadrage IA",
        context: "L'Oreal · direction digitale",
        route: "/prospection/accounts",
      },
      {
        id: "wed-2",
        moment: "11:30",
        type: "Echeance",
        title: "Envoyer le pitch secteur banque",
        context: "BNP Paribas · prospection",
        route: "/prospection",
      },
      {
        id: "wed-3",
        moment: "17:15",
        type: "Tache",
        title: "Ajuster l'etape de l'opportunite",
        context: "AXA Group · opportunity cloud",
        route: "/missions/opps",
      },
    ],
  },
  {
    key: "thu",
    label: "Jeu",
    dateNumber: "25",
    count: 2,
    items: [
      {
        id: "thu-1",
        moment: "09:45",
        type: "RDV",
        title: "Debrief entretien client",
        context: "Generali · besoin Data Platform",
        route: "/staffing",
      },
      {
        id: "thu-2",
        moment: "15:00",
        type: "Priorite",
        title: "Preparer la simulation financiere",
        context: "BNP Paribas · delivery manager",
        route: "/finance",
      },
    ],
  },
  {
    key: "fri",
    label: "Ven",
    dateNumber: "26",
    count: 2,
    items: [
      {
        id: "fri-1",
        moment: "10:30",
        type: "RDV",
        title: "Revue de portefeuille",
        context: "Equipe commerciale · pipeline ouvert",
        route: "/cockpit",
      },
      {
        id: "fri-2",
        moment: "17:00",
        type: "Echeance",
        title: "Cloturer les next steps de la semaine",
        context: "Suivi des actions · relances IA",
        route: "/prospection/suivi",
      },
    ],
  },
];

const STAFFING_NEEDS = [
  {
    id: "need-1",
    rank: "01",
    title: "Lead Data Engineer",
    client: "Generali",
    step: "Recherche profils",
    positioned: "2 profils",
    due: "Avant le 25 juin",
    indicator: "Couverture partielle",
    tone: "warning",
    primaryAction: "Envoyer au client",
  },
  {
    id: "need-2",
    rank: "02",
    title: "Architecte Cloud Migration",
    client: "AXA Group",
    step: "Entretien client",
    positioned: "1 profil",
    due: "26 juin",
    indicator: "Criticite haute",
    tone: "danger",
    primaryAction: "Securiser le demarrage",
  },
  {
    id: "need-3",
    rank: "03",
    title: "Delivery Manager SAP",
    client: "BNP Paribas",
    step: "Qualification",
    positioned: "0 profil",
    due: "Cette semaine",
    indicator: "Aucune couverture",
    tone: "neutral",
    primaryAction: "Positionner des profils",
  },
];

const MEETINGS = [
  {
    id: "meeting-1",
    client: "AXA Group",
    dateLabel: "mardi 24 juin",
    timeLabel: "09:00",
    contact: "Morel Claire",
    role: "Directrice de programme cloud",
    subject: "Comite de cadrage programme cloud",
    companyDrawerLabel: "AXA Group",
    contactDrawerLabel: "Claire Morel · AXA Group",
  },
  {
    id: "meeting-2",
    client: "L'Oreal",
    dateLabel: "mercredi 25 juin",
    timeLabel: "11:30",
    contact: "Vernet Nicolas",
    role: "Directeur transformation digitale",
    subject: "Pitch IA pour la direction digitale",
    companyDrawerLabel: "L'Oreal",
    contactDrawerLabel: "Nicolas Vernet · L'Oreal",
  },
  {
    id: "meeting-3",
    client: "Societe Generale",
    dateLabel: "jeudi 26 juin",
    timeLabel: "15:30",
    contact: "Caron Mathilde",
    role: "Responsable staffing data platform",
    subject: "Debrief CV envoyes Data Platform",
    companyDrawerLabel: "Societe Generale",
    contactDrawerLabel: "Mathilde Caron · Societe Generale",
  },
];

const PROSPECTION_METRICS = [
  { id: "metric-1", label: "Cibles", value: "12", detail: "a activer" },
  { id: "metric-2", label: "Pipe", value: "145 k€", detail: "pondere" },
  { id: "metric-3", label: "Urgences", value: "3/10", detail: "du jour" },
  { id: "metric-4", label: "Objectif", value: "60%", detail: "atteint" },
];

const PROSPECTION_PRIORITIES = [
  {
    id: "prospect-1",
    company: "Generali",
    reason: "Plan IT 2026 diffuse hier · fenetre d'approche immediate",
    nextMove: "Generer le pitch Assurance + appeler le sponsor",
  },
  {
    id: "prospect-2",
    company: "L'Oreal",
    reason: "Nouveau CTO detecte · contact d'introduction sous 48h",
    nextMove: "Rediger l'email IA puis preparer la relance",
  },
  {
    id: "prospect-3",
    company: "Societe Generale",
    reason: "Besoin Data confirme · dernier echange sans next step",
    nextMove: "Reprendre les analyses et poser un prochain rendez-vous",
  },
];

const BOTTOM_NAV_ITEMS = [
  { id: "nav-1", label: "Cockpit", active: true, icon: IconCockpit },
  { id: "nav-2", label: "Missions", active: false, icon: IconMissions },
  { id: "nav-3", label: "Prospection", active: false, icon: IconProspection },
  { id: "nav-4", label: "Proposals", active: false, icon: IconProposal },
  { id: "nav-5", label: "Finance", active: false, icon: IconFinance },
];

const SHEET_LIBRARY = {
  staffing: {
    title: "Actions staffing",
    eyebrow: "Staffings & besoins",
    actions: [
      { label: "Changer l'etape du staffing", icon: IconStage },
      { label: "Consulter les CV", icon: IconDocument },
      { label: "Creer ou modifier une tache", icon: IconTask },
      { label: "Contacter le client", icon: IconContact },
      { label: "Ouvrir la simulation financiere", icon: IconFinance },
    ],
  },
  meeting: {
    title: "Actions rendez-vous",
    eyebrow: "Rendez-vous clients",
    actions: [
      { label: "Elaborer un pitch", icon: IconBolt },
      { label: "Consulter l'actualite du client", icon: IconRadar },
      { label: "Generer une synthese des echanges avec Next Steps IA", icon: IconSparkStack },
      { label: "Creer ou modifier une tache", icon: IconTask },
    ],
  },
  prospect: {
    title: "Actions prospection",
    eyebrow: "Prospection",
    actions: [
      { label: "Creer un pitch ou rediger un email avec l'IA", icon: IconBolt },
      { label: "Appeler le prospect", icon: IconContact },
      { label: "Consulter ses analyses", icon: IconRadar },
      { label: "Creer ou modifier une tache", icon: IconTask },
    ],
  },
  quickActions: {
    title: "Actions rapides",
    eyebrow: "Commandes transverses",
    actions: [
      { label: "Enregistrer une note vocale", icon: IconMic },
      { label: "Creer ou mettre a jour une tache", icon: IconTask },
      { label: "Creer ou mettre a jour un besoin", icon: IconStage },
      { label: "Acceder au simulateur financier", icon: IconFinance },
      { label: "Creer ou mettre a jour un contact", icon: IconContact },
    ],
  },
};

const DRAWER_LIBRARY = {
  company: {
    eyebrow: "Fiche entreprise",
    title: "Entreprise",
    sections: [
      { label: "Compte", value: "Grand compte active" },
      { label: "Focus", value: "Transformation cloud et modernisation data" },
      { label: "Prochain levier", value: "Pitch cible + preparation du prochain atelier" },
    ],
  },
  contact: {
    eyebrow: "Fiche contact",
    title: "Contact",
    sections: [
      { label: "Role", value: "Sponsor metier en cours d'activation" },
      { label: "Dernier echange", value: "Echange de cadrage cette semaine" },
      { label: "Prochain levier", value: "Envoyer la synthese puis fixer le prochain point" },
    ],
  },
};

function getPresetFromQuery() {
  const search = new URLSearchParams(window.location.search);
  const state = search.get("state");

  if (state === "sheet") {
    return {
      selectedDay: "tue",
      agendaOpen: true,
      sheet: {
        kind: "staffing",
        label: "Architecte Cloud Migration · AXA Group",
      },
      drawer: null,
      scrollTarget: "staffing",
    };
  }

  if (state === "staffing-sheet") {
    return {
      selectedDay: "tue",
      agendaOpen: false,
      sheet: {
        kind: "staffing",
        label: "Architecte Cloud Migration · AXA Group",
      },
      drawer: null,
      scrollTarget: "staffing",
    };
  }

  if (state === "meeting-sheet") {
    return {
      selectedDay: "tue",
      agendaOpen: false,
      sheet: {
        kind: "meeting",
        label: "AXA Group · mardi 24 juin · 09:00",
      },
      drawer: null,
      scrollTarget: "meetings",
    };
  }

  if (state === "quick-actions") {
    return {
      selectedDay: "tue",
      agendaOpen: false,
      sheet: {
        kind: "quickActions",
        label: "Actions rapides",
      },
      drawer: null,
      scrollTarget: null,
    };
  }

  if (state === "expanded") {
    return {
      selectedDay: "tue",
      agendaOpen: true,
      sheet: null,
      drawer: null,
      scrollTarget: null,
    };
  }

  if (state === "company-drawer") {
    return {
      selectedDay: "tue",
      agendaOpen: false,
      sheet: null,
      drawer: {
        kind: "company",
        label: "AXA Group",
      },
      scrollTarget: "meetings",
    };
  }

  if (state === "contact-drawer") {
    return {
      selectedDay: "tue",
      agendaOpen: false,
      sheet: null,
      drawer: {
        kind: "contact",
        label: "Claire Morel · AXA Group",
      },
      scrollTarget: "meetings",
    };
  }

  return {
    selectedDay: "tue",
    agendaOpen: false,
    sheet: null,
    drawer: null,
    scrollTarget: null,
  };
}

function getToneClassName(tone) {
  if (tone === "danger") return "tone-danger";
  if (tone === "warning") return "tone-warning";
  return "tone-neutral";
}

function getNeedDueCompactLabel(dueLabel) {
  if (dueLabel.includes("25 juin")) return "25/06";
  if (dueLabel.includes("26 juin")) return "26/06";
  if (dueLabel.includes("Cette semaine")) return "27/06";
  return "25/06";
}

function getStateLabel(isAgendaOpen, sheet, drawer) {
  if (drawer?.kind === "company") return "company-drawer";
  if (drawer?.kind === "contact") return "contact-drawer";
  if (sheet?.kind === "quickActions") return "quick-actions";
  if (sheet?.kind === "meeting") return "meeting-sheet";
  if (sheet?.kind === "staffing" && !isAgendaOpen) return "staffing-sheet";
  if (sheet) return "sheet";
  if (isAgendaOpen) return "expanded";
  return "collapsed";
}

export function App() {
  const initialState = useMemo(() => getPresetFromQuery(), []);
  const [selectedDay, setSelectedDay] = useState(initialState.selectedDay);
  const [isAgendaOpen, setAgendaOpen] = useState(initialState.agendaOpen);
  const [sheet, setSheet] = useState(initialState.sheet);
  const [drawer, setDrawer] = useState(initialState.drawer);
  const [toastMessage, setToastMessage] = useState("");
  const staffingSectionRef = useRef(null);
  const meetingsSectionRef = useRef(null);

  const agendaDay = WEEK_DAYS.find((day) => day.key === selectedDay) ?? WEEK_DAYS[1];

  useEffect(() => {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("state", getStateLabel(isAgendaOpen, sheet, drawer));
    window.history.replaceState({}, "", nextUrl);
  }, [isAgendaOpen, sheet, drawer]);

  useEffect(() => {
    if (!toastMessage) return undefined;

    const timeout = window.setTimeout(() => setToastMessage(""), 1600);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  useEffect(() => {
    if (initialState.scrollTarget === "staffing") {
      staffingSectionRef.current?.scrollIntoView({ block: "start" });
    }

    if (initialState.scrollTarget === "meetings") {
      meetingsSectionRef.current?.scrollIntoView({ block: "start" });
    }
  }, [initialState.scrollTarget]);

  function handleDayPress(dayKey) {
    setSheet(null);
    setDrawer(null);

    if (dayKey === selectedDay && isAgendaOpen) {
      setAgendaOpen(false);
      return;
    }

    setSelectedDay(dayKey);
    setAgendaOpen(true);
  }

  function openSheet(kind, label) {
    setDrawer(null);
    setSheet({ kind, label });
  }

  function openDrawer(kind, label) {
    setSheet(null);
    setDrawer({ kind, label });
  }

  function triggerAction(label) {
    setToastMessage(`Action simulee: ${label}`);
  }

  return (
    <div className="prototype-root">
      <aside className="capture-panel" aria-label="Controle des etats">
        <p className="capture-eyebrow">Prototype mobile</p>
        <h1>Cockpit commercial journalier</h1>
        <p className="capture-copy">
          Direction unique: centre de commande mobile, plat, dense juste ce qu'il
          faut, aligne sur les tokens KREDO.
        </p>
        <div className="capture-actions">
          <button type="button" onClick={() => { setAgendaOpen(false); setSelectedDay("tue"); setSheet(null); setDrawer(null); }}>
            Etat A
          </button>
          <button type="button" onClick={() => { setAgendaOpen(true); setSelectedDay("tue"); setSheet(null); setDrawer(null); }}>
            Etat B
          </button>
          <button type="button" onClick={() => { setAgendaOpen(true); setSelectedDay("tue"); setSheet({ kind: "staffing", label: "Architecte Cloud Migration · AXA Group" }); setDrawer(null); }}>
            Etat C
          </button>
          <button type="button" onClick={() => { setAgendaOpen(false); setSelectedDay("tue"); setSheet({ kind: "quickActions", label: "Actions rapides" }); setDrawer(null); }}>
            Etat D
          </button>
          <button type="button" onClick={() => { setAgendaOpen(false); setSelectedDay("tue"); setSheet(null); setDrawer({ kind: "company", label: "AXA Group" }); }}>
            Etat E
          </button>
          <button type="button" onClick={() => { setAgendaOpen(false); setSelectedDay("tue"); setSheet(null); setDrawer({ kind: "contact", label: "Claire Morel · AXA Group" }); }}>
            Etat F
          </button>
        </div>
      </aside>

      <div className="phone-stage">
        <div className="mobile-viewport">
          <header className="top-header">
            <div className="brand-lockup">
              <span className="brand-mark">
                <img src="/logo_sans_fond.png" alt="Logo KREDO" />
              </span>
              <span className="brand-title">Cockpit</span>
            </div>

            <div className="header-controls">
              <button
                type="button"
                className="header-bell"
                aria-label="Notifications"
                onClick={() => triggerAction("Ouvrir les notifications")}
              >
                <IconBell />
                <span className="bell-count">3</span>
              </button>
              <button
                type="button"
                className="header-quick-action"
                aria-label="Ouvrir les actions rapides"
                onClick={() => openSheet("quickActions", "Actions rapides")}
              >
                <IconBolt />
              </button>
            </div>
          </header>

          <div className="screen-scroll">
            <section ref={staffingSectionRef} className="module-panel">
              <div className="module-head">
                <h2>Agenda</h2>
              </div>

              <div className="agenda-strip" role="tablist" aria-label="Agenda semaine">
                {WEEK_DAYS.map((day) => {
                  const isSelected = day.key === selectedDay;
                  return (
                    <button
                      key={day.key}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      className={`agenda-day ${isSelected ? "is-selected" : ""}`}
                      onClick={() => handleDayPress(day.key)}
                    >
                      <span className="agenda-day-label">{day.label}</span>
                      <span className="agenda-day-date">{day.dateNumber}</span>
                      <span className="agenda-day-count">{day.count}</span>
                    </button>
                  );
                })}
              </div>

              <div
                className="agenda-details"
                data-open={isAgendaOpen ? "true" : "false"}
                aria-hidden={!isAgendaOpen}
              >
                <div className="agenda-details-inner">
                  <div className="agenda-day-summary">
                    <div>
                      <strong>{agendaDay.label} 23</strong>
                      <span>{agendaDay.count} actions a traiter</span>
                    </div>
                  </div>

                  <div className="agenda-list">
                    {agendaDay.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="agenda-item"
                        onClick={() => triggerAction(`Ouvrir ${item.route}`)}
                      >
                        <div className="agenda-item-side">
                          <span>{item.moment}</span>
                          <small>{item.type}</small>
                        </div>
                        <div className="agenda-item-main">
                          <strong>{item.title}</strong>
                          <p>{item.context}</p>
                        </div>
                        <span className="agenda-item-chevron" aria-hidden="true">
                          <IconChevron />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section ref={meetingsSectionRef} className="module-panel">
              <div className="module-head">
                <h2>Staffings & besoins</h2>
              </div>

              <div className="stack-list">
                {STAFFING_NEEDS.map((need) => (
                  <article key={need.id} className="stack-row staffing-row" data-due={getNeedDueCompactLabel(need.due)}>
                    <div className="stack-row-top">
                      <div className="row-heading">
                        <span className="row-rank">{need.rank}</span>
                        <div className="row-heading-copy">
                          <h3>{need.title}</h3>
                          <p>{need.client}</p>
                        </div>
                      </div>
                    </div>

                    <dl className="mini-facts mini-facts-staffing">
                      <div>
                        <dt>Etape</dt>
                        <dd>{need.step}</dd>
                      </div>
                      <div>
                        <dt>Positionnes</dt>
                        <dd>{need.positioned}</dd>
                      </div>
                    </dl>

                    <div className="action-cluster">
                      <button type="button" className="primary-button" onClick={() => triggerAction(need.primaryAction)}>
                        {need.primaryAction}
                      </button>
                      <button type="button" className="secondary-button" onClick={() => openSheet("staffing", `${need.title} · ${need.client}`)}>
                        Action
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="module-panel">
              <div className="module-head">
                <h2>Rendez-vous clients</h2>
              </div>

              <div className="stack-list">
                {MEETINGS.map((meeting) => (
                  <article key={meeting.id} className="stack-row compact-row meeting-row">
                    <div className="stack-row-top">
                      <div className="meeting-topline">
                        <div className="meeting-link-group">
                          <button
                            type="button"
                            className="inline-link"
                            aria-label={`Ouvrir la fiche entreprise ${meeting.companyDrawerLabel}`}
                            onClick={() => openDrawer("company", meeting.companyDrawerLabel)}
                          >
                            <span className="inline-link-illustration" aria-hidden="true">
                              <IconCompany />
                            </span>
                            <span>{meeting.client}</span>
                          </button>
                        </div>
                        <div className="meeting-schedule-block" aria-label={`${meeting.dateLabel} ${meeting.timeLabel}`}>
                          <span>{meeting.dateLabel}</span>
                          <strong>{meeting.timeLabel}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="meeting-meta-row">
                      <button
                        type="button"
                        className="inline-link inline-link-muted"
                        aria-label={`Ouvrir la fiche contact ${meeting.contactDrawerLabel}`}
                        onClick={() => openDrawer("contact", meeting.contactDrawerLabel)}
                      >
                        <span className="inline-link-illustration" aria-hidden="true">
                          <IconContactCard />
                        </span>
                        <span>{`${meeting.contact} - ${meeting.role}`}</span>
                      </button>
                    </div>

                    <div className="meeting-body">
                      <strong>{`Objet : ${meeting.subject}`}</strong>
                    </div>

                    <div className="action-cluster meeting-actions">
                      <button type="button" className="primary-button" onClick={() => triggerAction(`Preparer ${meeting.client}`)}>
                        Preparer
                      </button>
                      <button type="button" className="secondary-button" onClick={() => openSheet("meeting", `${meeting.client} · ${meeting.dateLabel} · ${meeting.timeLabel}`)}>
                        Action
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="module-panel">
              <div className="module-head">
                <h2>Prospection</h2>
              </div>

              <div className="metric-row" aria-label="Metriques prospection">
                {PROSPECTION_METRICS.map((metric) => (
                  <div key={metric.id} className="metric-cell">
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                    <small>{metric.detail}</small>
                  </div>
                ))}
              </div>

              <div className="stack-list">
                {PROSPECTION_PRIORITIES.map((priority) => (
                  <article key={priority.id} className="stack-row compact-row">
                    <div className="stack-row-top">
                      <div className="row-heading row-heading-compact">
                        <div>
                          <h3>{priority.company}</h3>
                          <p>{priority.reason}</p>
                        </div>
                      </div>
                    </div>

                    <div className="meeting-body">
                      <strong>{priority.nextMove}</strong>
                    </div>

                    <div className="action-cluster">
                      <button type="button" className="primary-button" onClick={() => triggerAction(`Pitch IA pour ${priority.company}`)}>
                        Pitch IA
                      </button>
                      <button type="button" className="secondary-button" onClick={() => openSheet("prospect", priority.company)}>
                        Action
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <nav className="bottom-nav" aria-label="Navigation principale mobile">
            {BOTTOM_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`bottom-nav-item ${item.active ? "is-active" : ""}`}
                  onClick={() => triggerAction(`Basculer vers ${item.label}`)}
                >
                  <span className="bottom-nav-icon">
                    <Icon />
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {toastMessage ? <div className="toast-banner">{toastMessage}</div> : null}

          <ActionSheet sheet={sheet} onClose={() => setSheet(null)} onActionSelect={triggerAction} />
          <EntityDrawer drawer={drawer} onClose={() => setDrawer(null)} />
        </div>
      </div>
    </div>
  );
}

function EntityDrawer({ drawer, onClose }) {
  if (!drawer) return null;

  const definition = DRAWER_LIBRARY[drawer.kind];

  return (
    <div className="drawer-overlay" role="presentation" onClick={onClose}>
      <aside
        className="entity-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={definition.title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="drawer-header">
          <p>{definition.eyebrow}</p>
          <h2>{definition.title}</h2>
          <span>{drawer.label}</span>
        </div>

        <div className="drawer-body">
          {definition.sections.map((section) => (
            <div key={section.label} className="drawer-section">
              <small>{section.label}</small>
              <strong>{section.value}</strong>
            </div>
          ))}
        </div>

        <button type="button" className="sheet-close" onClick={onClose}>
          Fermer
        </button>
      </aside>
    </div>
  );
}

function ActionSheet({ sheet, onClose, onActionSelect }) {
  if (!sheet) return null;

  const definition = SHEET_LIBRARY[sheet.kind];
  const meetingParts = sheet.kind === "meeting" ? sheet.label.split(" · ") : null;
  const meetingClient = meetingParts ? meetingParts[0] ?? "" : "";
  const meetingDate = meetingParts ? meetingParts[1] ?? "" : "";
  const meetingTime = meetingParts ? meetingParts[2] ?? "" : "";

  return (
    <div className="sheet-overlay" role="presentation" onClick={onClose}>
      <section
        className="action-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={definition.title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-grabber" aria-hidden="true" />
        <div className="sheet-header">
          <p>{definition.eyebrow}</p>
          {sheet.kind === "meeting" ? (
            <div className="sheet-meeting-summary" aria-label={sheet.label}>
              <h2>{`${meetingClient} - ${meetingDate} - ${meetingTime}`}</h2>
            </div>
          ) : (
            <>
              <h2>{definition.title}</h2>
              <span>{sheet.label}</span>
            </>
          )}
        </div>

        <div className="sheet-actions">
          {definition.actions.map((action) => {
            const Icon = action.icon;

            return (
            <button
              key={action.label}
              type="button"
              className="sheet-action"
              onClick={() => {
                onActionSelect(action.label);
                onClose();
              }}
            >
              <span className="sheet-action-leading">
                <span className="sheet-action-icon" aria-hidden="true">
                  <Icon />
                </span>
                <span>{action.label}</span>
              </span>
              <IconChevron />
            </button>
            );
          })}
        </div>

        <button type="button" className="sheet-close" onClick={onClose}>
          Fermer
        </button>
      </section>
    </div>
  );
}

function IconBell() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 18.75a2.25 2.25 0 0 1-4.5 0m8.25-1.5H6l1.125-1.667V10.5a4.875 4.875 0 1 1 9.75 0v5.083L18 17.25Z" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3.75v3m7.5-3v3M4.5 8.25h15m-13.5 12h12a1.5 1.5 0 0 0 1.5-1.5V6.75a1.5 1.5 0 0 0-1.5-1.5h-12a1.5 1.5 0 0 0-1.5 1.5v12a1.5 1.5 0 0 0 1.5 1.5Z" />
    </svg>
  );
}

function IconBolt() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </svg>
  );
}

function IconChevron() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m7.5 5 5 5-5 5" />
    </svg>
  );
}

function IconCompany() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 16.25h12.5M5.25 16.25V6.75L10 3.75l4.75 3v9.5M7.75 9.25h.5m3.5 0h.5m-4 3h.5m3.5 0h.5" />
    </svg>
  );
}

function IconContactCard() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 10a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Zm-4.25 5a4.25 4.25 0 0 1 8.5 0M3.75 4.75h12.5v10.5H3.75z" />
    </svg>
  );
}

function IconCockpit() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15A2.25 2.25 0 0 1 18.75 17.25H5.25A2.25 2.25 0 0 1 3 15V5.25M21 5.25A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25M21 5.25V12A2.25 2.25 0 0 1 18.75 14.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
    </svg>
  );
}

function IconMissions() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" />
    </svg>
  );
}

function IconTask() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 11.25 11.25 13.5 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function IconStage() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 18.75h15m-12-4.5h6m-9-4.5h12m-9-4.5h6" />
    </svg>
  );
}

function IconDocument() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 2.25H6.75A2.25 2.25 0 0 0 4.5 4.5v15A2.25 2.25 0 0 0 6.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25V9.75L14.25 2.25ZM14.25 2.25v7.5h7.5M9 13.5h6m-6 3h6" />
    </svg>
  );
}

function IconContact() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  );
}

function IconRadar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a6 6 0 1 0-6-6m6 6a6 6 0 0 0 6-6m-6 6v3m0-9a3 3 0 1 0-3-3" />
    </svg>
  );
}

function IconSparkStack() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m12 3 1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Zm6 12 1 2.5L21.5 18 19 19l-1 2.5L17 19l-2.5-1 2.5-.5 1-2.5ZM6 14l1.25 3L10 18.25 7.25 19 6 22l-1.25-3L2 18.25 4.75 17 6 14Z" />
    </svg>
  );
}

function IconMic() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm0 0v4.5m-4.5-7.5a4.5 4.5 0 0 0 9 0" />
    </svg>
  );
}

function IconProspection() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  );
}

function IconProposal() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625A3.375 3.375 0 0 0 16.125 8.25h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5A3.375 3.375 0 0 0 10.125 2.25H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625A1.125 1.125 0 0 0 4.5 3.375v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

function IconFinance() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.251.251a3.502 3.502 0 0 0 4.996 0l2.251-2.251a3.502 3.502 0 0 0 0-4.996l-2.251-2.251a3.502 3.502 0 0 0-4.996 0L9 7.182M12 3v3.75m0 13.5V21" />
    </svg>
  );
}
