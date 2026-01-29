// Somepostausten tyypit
export const socialPostTypes = [
  { id: 'viikko-ohjelma', name: 'Viikko-ohjelma', icon: '📅', color: 'bg-blue-500' },
  { id: 'kuukausiohjelma', name: 'Kuukausiohjelma', icon: '📆', color: 'bg-purple-500' },
  { id: 'artisti-animaatio', name: 'Artisti-animaatio', icon: '🎬', color: 'bg-pink-500' },
  { id: 'artisti-karuselli', name: 'Artisti-karuselli', icon: '📸', color: 'bg-orange-500' },
  { id: 'fiilistelypostaus', name: 'Fiilistelypostaus', icon: '✨', color: 'bg-yellow-500' },
  { id: 'reels', name: 'Reels', icon: '🎥', color: 'bg-red-500' },
  { id: 'tapahtuma-mainospostaus', name: 'Tapahtuma-mainospostaus', icon: '🎉', color: 'bg-green-500' },
  { id: 'last-minute', name: 'Last minute -markkinointi', icon: '⚡', color: 'bg-red-600' },
  { id: 'kiitos', name: 'Kiitos-postaus', icon: '🙏', color: 'bg-green-600' },
  { id: 'teaser', name: 'Teaser', icon: '🎬', color: 'bg-indigo-500' },
  { id: 'tiedote', name: 'Tiedote', icon: '📢', color: 'bg-blue-600' },
  { id: 'tarinat', name: 'Tarinat', icon: '📖', color: 'bg-purple-600' },
  { id: 'muu', name: 'Muu', icon: '📝', color: 'bg-gray-500' }
];

// Somekanavat
export const socialChannels = [
  { id: 'FB', name: 'Facebook', icon: '📘' },
  { id: 'IG', name: 'Instagram Feed', icon: '📸' },
  { id: 'IG-Story', name: 'Instagram Story', icon: '📱' },
  { id: 'IG-Reels', name: 'Instagram Reels', icon: '🎬' },
  { id: 'TikTok', name: 'TikTok', icon: '🎵' },
  { id: 'instagram', name: 'Instagram', icon: '📸' },
  { id: 'facebook', name: 'Facebook', icon: '👥' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵' },
  { id: 'newsletter', name: 'Uutiskirje', icon: '📧' }
];

// Apufunktio: Hae somepostauksen tyyppi objektina
export const getSocialPostType = (typeId) => {
  return socialPostTypes.find(type => type.id === typeId);
};

// Apufunktio: Hae somekanava objektina
export const getSocialChannel = (channelId) => {
  return socialChannels.find(channel => channel.id === channelId);
};

// Somepostausten tyypit map-muodossa (käytetään calendar.ics.js:ssä)
export const socialPostTypesMap = {
  'viikko-ohjelma': '📅 Viikko-ohjelma',
  'kuukausiohjelma': '📆 Kuukausiohjelma',
  'artisti-animaatio': '🎬 Artisti-animaatio',
  'artisti-karuselli': '📸 Artisti-karuselli',
  'fiilistelypostaus': '✨ Fiilistelypostaus',
  'reels': '🎥 Reels',
  'tapahtuma-mainospostaus': '🎉 Tapahtuma-mainospostaus',
  'tapahtuma-muistutus': '⏰ Tapahtuma-muistutus',
  'kilpailu': '🎁 Kilpailu',
  'last-minute': '⚡ Last minute',
  'kiitos': '🙏 Kiitos',
  'teaser': '🎬 Teaser',
  'tiedote': '📢 Tiedote',
  'tarinat': '📖 Tarinat',
  'muu': '📝 Muu'
};

// Vuodet (sovelluksen käytettävissä olevat vuodet)
export const years = [2021, 2022, 2023, 2024, 2025, 2026];

// Markkinointikanavat
export const channels = [
  { id: 'instagram', name: 'Instagram', color: 'bg-pink-500' },
  { id: 'facebook', name: 'Facebook', color: 'bg-blue-500' },
  { id: 'tiktok', name: 'TikTok', color: 'bg-black' },
  { id: 'newsletter', name: 'Uutiskirje', color: 'bg-green-500' },
  { id: 'print', name: 'Printit', color: 'bg-purple-500' },
  { id: 'ts-meno', name: 'TS Menovinkit', color: 'bg-orange-500' },
  { id: 'turku-calendar', name: 'Turun kalenteri', color: 'bg-blue-700' }
];

// Markkinointitoimenpiteet joista voidaan valita
export const marketingOperations = [
  {
    id: 'ig-feed',
    name: 'Instagram Feed -postaus',
    channel: 'instagram',
    icon: '📸',
    daysBeforeEvent: 7,
    defaultTime: '12:00',
    description: '1:1 kuva + caption'
  },
  {
    id: 'ig-reel',
    name: 'Instagram Reels',
    channel: 'instagram',
    icon: '🎬',
    daysBeforeEvent: 5,
    defaultTime: '14:00',
    description: 'Lyhyt video 15-30s'
  },
  {
    id: 'ig-story',
    name: 'Instagram Story',
    channel: 'instagram',
    icon: '📱',
    daysBeforeEvent: 1,
    defaultTime: '18:00',
    description: '9:16 stoory-päivitys'
  },
  {
    id: 'fb-post',
    name: 'Facebook -postaus',
    channel: 'facebook',
    icon: '📘',
    daysBeforeEvent: 5,
    defaultTime: '10:00',
    description: 'Orgaaninen postaus'
  },
  {
    id: 'fb-event',
    name: 'Facebook Event',
    channel: 'facebook',
    icon: '🎫',
    daysBeforeEvent: 14,
    defaultTime: '11:00',
    description: 'Tapahtuman luonti FB:ssä'
  },
  {
    id: 'tiktok',
    name: 'TikTok -video',
    channel: 'tiktok',
    icon: '🎵',
    daysBeforeEvent: 4,
    defaultTime: '16:00',
    description: 'Lyhyt mukaansatempaava video'
  },
  {
    id: 'newsletter',
    name: 'Uutiskirje',
    channel: 'newsletter',
    icon: '📧',
    daysBeforeEvent: 7,
    defaultTime: '09:00',
    description: 'Sähköpostiviesti tilaajille'
  },
  {
    id: 'print',
    name: 'Printit (julisteet)',
    channel: 'print',
    icon: '🖨️',
    daysBeforeEvent: 21,
    defaultTime: '10:00',
    description: 'Fyysiset julisteet ja mainosmateriaalit'
  },
  {
    id: 'ts-meno',
    name: 'TS Menovinkit',
    channel: 'ts-meno',
    icon: '📰',
    daysBeforeEvent: 10,
    defaultTime: '10:00',
    description: 'Turun Sanomien menolista'
  },
  {
    id: 'turku-calendar',
    name: 'Turun tapahtumakalenteri',
    channel: 'turku-calendar',
    icon: '📅',
    daysBeforeEvent: 28,
    defaultTime: '10:00',
    description: 'Kaupungin virallinen kalenteri'
  }
];

// Kuvaformaatit eri kanaviin
export const imageFormats = [
  { id: 'ig-feed', name: 'Instagram Feed', ratio: '1:1 (1080x1080px)', icon: '📸' },
  { id: 'ig-story', name: 'Instagram Story', ratio: '9:16 (1080x1920px)', icon: '📱' },
  { id: 'fb-feed', name: 'Facebook Feed', ratio: '1.91:1 (1200x630px)', icon: '📘' },
  { id: 'fb-event', name: 'Facebook Event', ratio: '16:9 (1920x1080px)', icon: '🎫' },
  { id: 'tiktok', name: 'TikTok', ratio: '9:16 (1080x1920px)', icon: '🎵' },
  { id: 'newsletter', name: 'Uutiskirje', ratio: '2:1 (800x400px)', icon: '📧' },
  { id: 'calendar', name: 'Tapahtumakalenteri', ratio: '16:9 (1200x675px)', icon: '📅' }
];
