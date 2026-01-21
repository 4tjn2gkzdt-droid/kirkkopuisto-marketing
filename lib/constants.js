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
