// BOARD THEMES: each theme's cloth, point, checker and wood colours, and its background photo.
window.Jacko = window.Jacko || {};

Jacko.THEMES = [
  { id: 'gb', label: 'Deep Ocean', felt: '#0b1330', felt2: '#131f4a', edge: '#060b1e',
    ptA: '#d8d2c0', ptB: '#2a58a0', ckA: '#f4f2ec', ckB: '#2c62c6', wood: '#6b4423' },
  { id: 'classic', label: 'Classic', felt: '#1f8b3d', felt2: '#26a047', edge: '#146428',
    ptA: '#7c2e22', ptB: '#16181a', ckA: '#f2efe6', ckB: '#7c2e22', wood: '#2a2622' },
  { id: 'moss', label: 'Moss & Red', felt: '#4e5c22', felt2: '#5c6a2a', edge: '#3a4418',
    ptA: '#7c2e22', ptB: '#23262a', ckA: '#e8e2d2', ckB: '#7c2e22', wood: '#5a5c2a' },
  { id: 'mint', label: 'Cream Mint', felt: '#efe8bd', felt2: '#f6f1cf', edge: '#cfc79a',
    ptA: '#8caa87', ptB: '#3b2a1c', ckA: '#8caa87', ckB: '#3b2a1c', wood: '#8a7a4a' },
  { id: 'sage', label: 'Sage Teal', felt: '#c6cf9a', felt2: '#d2daac', edge: '#a4ac7a',
    ptA: '#3f8e93', ptB: '#3f4432', ckA: '#3f8e93', ckB: '#3f4432', wood: '#5c6440' },
  { id: 'ash', label: 'Ash Orange', felt: '#8d9095', felt2: '#9ca0a4', edge: '#6a6d72',
    ptA: '#a4a8a8', ptB: '#a3491e', ckA: '#a4a8a8', ckB: '#a3491e', wood: '#4a4d52' },
  { id: 'crimson', label: 'Ivory Crimson', felt: '#f2f0ee', felt2: '#fbfaf8', edge: '#cfccc8',
    ptA: '#8c2e38', ptB: '#22303f', ckA: '#8c2e38', ckB: '#22303f', wood: '#5a5c60' },
  { id: 'bone', label: 'Bone & Rust', felt: '#d4d0c6', felt2: '#dedad0', edge: '#aca89c',
    ptA: '#8c4520', ptB: '#1a1a1c', ckA: '#8c4520', ckB: '#1e1e20', wood: '#5c5a56' },
  { id: 'lagoon', label: 'Lagoon', felt: '#2f8fa6', felt2: '#3ba0b8', edge: '#1f6c80',
    ptA: '#a8bcc2', ptB: '#1e2b30', ckA: '#a8bcc2', ckB: '#1e2b30', wood: '#2a4048' },
  { id: 'olive', label: 'Olive & Lime', felt: '#5a6a20', felt2: '#68792a', edge: '#414d12',
    ptA: '#8a9c56', ptB: '#2a2010', ckA: '#8a9c56', ckB: '#2a2010', wood: '#3c4416' },
  { id: 'timber', label: 'Walnut & Maple', felt: '#2a2724', felt2: '#332f2b', edge: '#1b1917',
    ptA: '#b8a578', ptB: '#2f2b27', ckA: '#b8a578', ckB: '#4a3524', wood: '#8a6a44' },
  { id: 'rainforest', label: 'Rainforest', felt: '#26362f', felt2: '#2f4239', edge: '#1c2822',
    ptA: '#c2beac', ptB: '#1d4a32', ckA: '#c2beac', ckB: '#1d4a32', wood: '#4a3a26' },
  { id: 'casino', label: 'Casino', felt: '#0f8f3a', felt2: '#17a544', edge: '#0a6628',
    ptA: '#8c2e2e', ptB: '#c8c6c0', ckA: '#c8c6c0', ckB: '#1c1e22', wood: '#1e1e20' }
];

Jacko.PHOTOS = {
  gb: 'Old Sailing Ship', classic: 'Green Fields', moss: 'Japanese Garden', mint: 'Burano',
  sage: 'Teal Water', ash: 'Golden Gate', crimson: 'Croatian Coast', bone: 'Uluru',
  lagoon: 'Lagoon', olive: 'Bali Rice Terraces', timber: 'Sydney Harbour',
  rainforest: 'Rainforest River', casino: 'Las Vegas Strip'
};

Jacko.theme = function (id) {
  return Jacko.THEMES.find(function (t) { return t.id === id; }) || Jacko.THEMES[0];
};
