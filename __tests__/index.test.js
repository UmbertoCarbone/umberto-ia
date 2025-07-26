const { exec } = require("child_process");

// Mock della funzione exec
jest.mock("child_process", () => ({
  exec: (cmd, callback) => {
    callback(null, "Risposta di test", "");
  },
}));

// Importa la funzione da testare
const { queryOllama } = require("../index");

test("queryOllama restituisce una risposta di testo", async () => {
  const risposta = await queryOllama("Ciao");
  expect(risposta).toBe("Risposta di test");
});
