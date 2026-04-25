
async function test() {
    try {
        const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = await import('@whiskeysockets/baileys');
        console.log('makeWASocket type:', typeof makeWASocket);
        console.log('useMultiFileAuthState type:', typeof useMultiFileAuthState);
        console.log('DisconnectReason:', DisconnectReason);
        console.log('Browsers type:', typeof Browsers);
    } catch (e) {
        console.error('Error with destructuring import:', e);
        
        // Fallback check
        const mod = await import('@whiskeysockets/baileys');
        console.log('mod.default type:', typeof mod.default);
    }
}
test();
