// Konfiguracja wszystkich dostępnych podróży
const travelsConfig = [
    {
        id: 1,
        name: "Odcienie Uczuć",
        description: "Opowieść o miłości, tęsknocie i nadziei",
        path: "travels/1",
        files: ["1.json"]
    },
    {
        id: 2,
        name: "Druga Podróż",
        description: "Nowa historia z własnymi wyborami",
        path: "travels/2",
        files: ["1.json", "2.json"]
    }
    // Tutaj można dodawać więcej podróży w przyszłości
];

// Eksportuj konfigurację
window.travelsConfig = travelsConfig;