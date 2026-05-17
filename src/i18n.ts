export type Lang = 'pt' | 'en';

export const translations = {
  pt: {
    // Header
    appTitle: 'Painel da Ala',
    appSubtitle: 'Central de avisos e escalas da ala 1.',
    testDay: 'Testar Dia:',
    visionResident: 'Visão: Morador',
    visionRep: 'Visão: Representante',
    visionDev: 'Visão: Dev',
    roleResident: 'Morador',
    roleRep: 'Representante',
    roleDev: 'Dev',
    signOut: 'Sair',
    editMainTitle: 'Editar Título Principal',
    editSubtitle: 'Editar Subtítulo',
    editTabName: 'Editar Nome da Aba',
    language: 'Idioma',

    // Loading / Auth
    loading: 'Carregando...',
    loginTitle: 'Painel da Ala',
    loginDesc: 'Faça login para ver as escalas e avisos da limpeza.',
    loginBtn: 'Entrar com Google',

    // Nav tabs (defaults)
    tabMain: 'Escalas e Atividades',
    tabRules: 'Tarefas da Limpeza',
    tabGeneralRules: 'Regras da Ala',
    tabLinks: 'Links Úteis',
    tabProducts: 'Estoque',
    tabMaintenance: 'Manutenção',

    // Activities Panel
    activities: 'Atividades',
    cleaning: 'Limpeza',
    cleaningDesc: 'Responsável pela limpeza do banheiro e ala',
    maintenance: 'Manutenção',
    maintenanceDesc: 'Responsável pela manutenção do banheiro e ala',
    fridgeCleaning: 'Limpeza da geladeira',
    fridgeCleaningDesc: 'Responsável por organizar e limpar a geladeira.',
    buyingProducts: 'Comprar produtos',
    buyingProductsDesc: 'Responsável por repor os produtos de limpeza.',
    responsibleRoom: 'Quarto Responsável',
    auto: 'Auto',
    room: 'Quarto',
    coletivo: 'Coletivo',
    absentRooms: 'Quartos Ausentes',
    absentRoomsDescRep: 'Marque quem viajou esta semana — a rotação pula automaticamente.',
    absentRoomsDescResident: 'Quartos fora esta semana (rotação ajustada).',
    markAbsent: 'Marcar Q{room} como ausente',
    markPresent: 'Marcar Q{room} como presente',
    absentOne: 'Q{rooms} está fora — rotação ajustada.',
    absentMany: 'Q{rooms} estão fora — rotação ajustada.',

    // Calendar Section
    prevMonth: 'Mês anterior',
    nextMonth: 'Próximo mês',
    clearMonth: 'Limpar Mês',
    clearMonthConfirm: 'Tem certeza que deseja limpar todas as escalas manuais e datas personalizadas deste mês? Esta ação não pode ser desfeita.',
    calendarModes: {
      cleaning: 'Limpeza',
      maintenance: 'Manutenção',
      fridge: 'Geladeira',
      products: 'Produtos',
      coletivo: 'Coletivo',
    },
    weekDays: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
    today: 'Hoje',

    // Rules Tab
    newRuleBlock: 'Novo Bloco de Avisos',
    newGeneralRuleBlock: 'Novo Bloco de Regras Gerais',
    addItem: 'Adicionar Item',
    newRule: 'Nova Regra',
    noRules: 'Ainda não há regras neste bloco.',
    save: 'Salvar',
    cancel: 'Cancelar',
    add: 'Adicionar',
    deletePanel: 'Excluir Painel',
    removeRule: 'Remover Regra',
    blockTitlePlaceholder: 'Título do card...',
    rulePlaceholder: 'Ex: Não pode deixar toalha estendida na área da pia',
    generalRulePlaceholder: 'Ex: Jogar o lixo fora sempre...',
    newCleaningBlock: 'Nova Lousa de Limpeza',
    newGeneralBlock: 'Novo Bloco de Regras',

    // Links Tab
    addLink: 'Adicionar Link',
    noLinks: 'Nenhum link adicionado ainda.',
    newLink: 'Novo Link',
    editLink: 'Editar Link',
    linkTitle: 'Título',
    linkUrl: 'URL / Link',
    linkDesc: 'Descrição',
    linkColor: 'Cor',
    linkIcon: 'Ícone',
    linkTitlePlaceholder: 'Ex: Portal do Aluno',
    linkUrlPlaceholder: 'https://...',
    linkDescPlaceholder: 'Breve descrição do link...',
    deleteLink: 'Excluir este link?',
    invalidUrl: 'Por favor, insira um link válido começando com http:// ou https://',
    edit: 'Editar',
    delete: 'Excluir',

    // Maintenance Tab
    maintenanceTitle: 'Solicitação de Manutenção',
    maintenanceDefaultDesc: 'Preencha os campos abaixo com os problemas encontrados na ala ou no seu quarto. Ao clicar em enviar, sua solicitação será registrada automaticamente e enviada para a administração providenciar os reparos.',
    maintenanceField1: 'Pendências na Ala (informe a Ala)',
    maintenanceField2: 'Pendências no Quarto (informe o quarto)',
    maintenanceField3: 'Manutenções nos Espaços em Comum',
    maintenanceField1Placeholder: 'Descreva os problemas na ala em geral...',
    maintenanceField2Placeholder: 'Descreva os problemas específicos do seu quarto...',
    maintenanceField3Placeholder: 'Banheiro, cozinha, corredor, etc...',
    send: 'Enviar Solicitação',
    sending: 'Enviando...',
    maintenanceSuccess: 'Solicitação enviada com sucesso!',
    maintenanceError: 'Houve um erro ao enviar a solicitação. Verifique sua conexão.',
    corsWarning: '* Devido a políticas de segurança de rede (CORS), o navegador envia os dados diretamente ao Google Sheets de forma segura, mas não permite que o aplicativo leia o status de retorno. Se sua solicitação não for reconhecida, fale com o representante.',
    editTexts: 'Editar Textos da Aba',
    descriptionLabel: 'Descrição',
    field1Label: 'Título do Campo 1 (Ala)',
    field2Label: 'Título do Campo 2 (Quarto)',
    field3Label: 'Título do Campo 3 (Espaços Comuns)',
    saveChanges: 'Salvar Alterações',
    saving: 'Salvando...',

    // Modals
    dayTasks: 'Tarefas do dia',
    noTasksForDay: 'Nenhuma tarefa registrada para este dia.',
    close: 'Fechar',

    // Error Boundary
    errorTitle: 'Oops! Algo deu errado.',
    errorDesc: 'Ocorreu um erro inesperado na renderização do painel. Mas não se preocupe, os dados estão seguros e salvos no banco de dados.',
    reload: 'Recarregar Painel',

    // History
    history: 'Histórico',
    week: 'Semana',
    month: 'Mês',
    noHistory: 'Nenhum histórico disponível.',

    // Products Tab
    stock: 'Estoque',
    wingFund: 'Fundo da Ala',

    // Alert messages
    maintenanceOnlyTueThu: 'A Manutenção só pode ser agendada entre Terça e Quinta-feira.',
    roleChangeError: 'Erro ao alterar cargo. Verifique sua conexão e permissões.',
  },

  en: {
    // Header
    appTitle: 'Wing Panel',
    appSubtitle: 'Wing 1 schedule and announcements hub.',
    testDay: 'Test Day:',
    visionResident: 'View: Resident',
    visionRep: 'View: Representative',
    visionDev: 'View: Dev',
    roleResident: 'Resident',
    roleRep: 'Representative',
    roleDev: 'Dev',
    signOut: 'Sign out',
    editMainTitle: 'Edit Main Title',
    editSubtitle: 'Edit Subtitle',
    editTabName: 'Edit Tab Name',
    language: 'Language',

    // Loading / Auth
    loading: 'Loading...',
    loginTitle: 'Wing Panel',
    loginDesc: 'Sign in to view the cleaning schedules and announcements.',
    loginBtn: 'Sign in with Google',

    // Nav tabs (defaults)
    tabMain: 'Schedules & Activities',
    tabRules: 'Cleaning Tasks',
    tabGeneralRules: 'Wing Rules',
    tabLinks: 'Useful Links',
    tabProducts: 'Stock',
    tabMaintenance: 'Maintenance',

    // Activities Panel
    activities: 'Activities',
    cleaning: 'Cleaning',
    cleaningDesc: 'Responsible for cleaning the bathroom and wing',
    maintenance: 'Maintenance',
    maintenanceDesc: 'Responsible for maintaining the bathroom and wing',
    fridgeCleaning: 'Fridge cleaning',
    fridgeCleaningDesc: 'Responsible for organizing and cleaning the fridge.',
    buyingProducts: 'Buy cleaning supplies',
    buyingProductsDesc: 'Responsible for restocking cleaning products.',
    responsibleRoom: 'Responsible Room',
    auto: 'Auto',
    room: 'Room',
    coletivo: 'Shared',
    absentRooms: 'Absent Rooms',
    absentRoomsDescRep: 'Mark who traveled this week — the rotation skips automatically.',
    absentRoomsDescResident: 'Rooms away this week (rotation adjusted).',
    markAbsent: 'Mark R{room} as absent',
    markPresent: 'Mark R{room} as present',
    absentOne: 'R{rooms} is away — rotation adjusted.',
    absentMany: 'R{rooms} are away — rotation adjusted.',

    // Calendar Section
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
    clearMonth: 'Clear Month',
    clearMonthConfirm: 'Are you sure you want to clear all manual schedules and custom dates for this month? This action cannot be undone.',
    calendarModes: {
      cleaning: 'Cleaning',
      maintenance: 'Maintenance',
      fridge: 'Fridge',
      products: 'Products',
      coletivo: 'Shared',
    },
    weekDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    today: 'Today',

    // Rules Tab
    newRuleBlock: 'New Announcement Block',
    newGeneralRuleBlock: 'New General Rules Block',
    addItem: 'Add Item',
    newRule: 'New Rule',
    noRules: 'No rules in this block yet.',
    save: 'Save',
    cancel: 'Cancel',
    add: 'Add',
    deletePanel: 'Delete Panel',
    removeRule: 'Remove Rule',
    blockTitlePlaceholder: 'Card title...',
    rulePlaceholder: 'E.g.: No towels left spread on the sink area',
    generalRulePlaceholder: 'E.g.: Always take out the trash...',
    newCleaningBlock: 'New Cleaning Board',
    newGeneralBlock: 'New Rules Block',

    // Links Tab
    addLink: 'Add Link',
    noLinks: 'No links added yet.',
    newLink: 'New Link',
    editLink: 'Edit Link',
    linkTitle: 'Title',
    linkUrl: 'URL / Link',
    linkDesc: 'Description',
    linkColor: 'Color',
    linkIcon: 'Icon',
    linkTitlePlaceholder: 'E.g.: Student Portal',
    linkUrlPlaceholder: 'https://...',
    linkDescPlaceholder: 'Brief description of the link...',
    deleteLink: 'Delete this link?',
    invalidUrl: 'Please enter a valid link starting with http:// or https://',
    edit: 'Edit',
    delete: 'Delete',

    // Maintenance Tab
    maintenanceTitle: 'Maintenance Request',
    maintenanceDefaultDesc: 'Fill in the fields below with issues found in the wing or your room. Upon submission, your request will be automatically recorded and sent to the administration to arrange repairs.',
    maintenanceField1: 'Wing Issues (specify wing)',
    maintenanceField2: 'Room Issues (specify room)',
    maintenanceField3: 'Common Area Maintenance',
    maintenanceField1Placeholder: 'Describe general wing problems...',
    maintenanceField2Placeholder: 'Describe issues specific to your room...',
    maintenanceField3Placeholder: 'Bathroom, kitchen, hallway, etc...',
    send: 'Submit Request',
    sending: 'Sending...',
    maintenanceSuccess: 'Request submitted successfully!',
    maintenanceError: 'There was an error submitting the request. Check your connection.',
    corsWarning: '* Due to network security policies (CORS), the browser sends data directly to Google Sheets securely, but cannot read the return status. If your request is not acknowledged, contact the representative.',
    editTexts: 'Edit Tab Texts',
    descriptionLabel: 'Description',
    field1Label: 'Field 1 Title (Wing)',
    field2Label: 'Field 2 Title (Room)',
    field3Label: 'Field 3 Title (Common Areas)',
    saveChanges: 'Save Changes',
    saving: 'Saving...',

    // Modals
    dayTasks: 'Day tasks',
    noTasksForDay: 'No tasks recorded for this day.',
    close: 'Close',

    // Error Boundary
    errorTitle: 'Oops! Something went wrong.',
    errorDesc: 'An unexpected rendering error occurred. Don\'t worry, your data is safe and saved in the database.',
    reload: 'Reload Panel',

    // History
    history: 'History',
    week: 'Week',
    month: 'Month',
    noHistory: 'No history available.',

    // Products Tab
    stock: 'Stock',
    wingFund: 'Wing Fund',

    // Alert messages
    maintenanceOnlyTueThu: 'Maintenance can only be scheduled between Tuesday and Thursday.',
    roleChangeError: 'Error changing role. Check your connection and permissions.',
  },
} as const;

export type TranslationKey = keyof typeof translations['pt'];
export type Translations = typeof translations['pt'];
