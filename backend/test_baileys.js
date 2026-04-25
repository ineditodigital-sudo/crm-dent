
async function test() {
    try {
        const baileysMod = await import('@whiskeysockets/baileys');
        console.log('baileysMod keys:', Object.keys(baileysMod));
        if (baileysMod.default) {
            console.log('baileysMod.default keys:', Object.keys(baileysMod.default));
        }
        
        const main = baileysMod.default || baileysMod;
        const useWASocket = main.default || main;
        console.log('useWASocket type:', typeof useWASocket);
        
        const auth = baileysMod.useMultiFileAuthState || (main && main.useMultiFileAuthState);
        console.log('useMultiFileAuthState type:', typeof auth);
    } catch (e) {
        console.error(e);
    }
}
test();
