import { Buffer } from "node:buffer";
import { BrowserWindow } from "electron";

export type PrintToPdfInput = {
  html: string;
};

export class ElectronPrintService {
  async renderPdf(input: PrintToPdfInput): Promise<Uint8Array> {
    const window = new BrowserWindow({
      width: 900,
      height: 1200,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });

    try {
      const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(input.html)}`;
      await window.loadURL(dataUrl);
      const pdf = await window.webContents.printToPDF({
        printBackground: true,
        pageSize: "A4",
        margins: {
          marginType: "default"
        }
      });

      return pdf instanceof Uint8Array ? pdf : new Uint8Array(Buffer.from(pdf));
    } finally {
      window.destroy();
    }
  }
}
