export interface BcvRatesResult {
  usd: number;
  eur: number;
  date: string;
  source: string;
}

export class RatesService {
  private async fetchWithTimeout(url: string, timeoutMs = 4000): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(id);
    }
  }

  async getBcvRates(date?: string): Promise<BcvRatesResult> {
    const today = new Date().toISOString().slice(0, 10);
    const targetDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today;

    let usd = 0;
    let eur = 0;

    // Si la fecha es pasada, intentar endpoints históricos
    if (targetDate !== today) {
      const [year, month, day] = targetDate.split('-');
      try {
        const [resUsd, resEur] = await Promise.all([
          this.fetchWithTimeout(`https://ve.dolarapi.com/v1/historicos/dolares/oficial/${year}/${month}/${day}`),
          this.fetchWithTimeout(`https://ve.dolarapi.com/v1/historicos/euros/oficial/${year}/${month}/${day}`),
        ]);

        if (resUsd.ok) {
          const dataUsd = (await resUsd.json()) as { promedio?: number; venta?: number };
          usd = Number(dataUsd.promedio ?? dataUsd.venta ?? 0);
        }
        if (resEur.ok) {
          const dataEur = (await resEur.json()) as { promedio?: number; venta?: number };
          eur = Number(dataEur.promedio ?? dataEur.venta ?? 0);
        }
      } catch (err) {
        // Fallback a oficiales actuales si hay error o timeout
      }
    }

    // Si no se obtuvo histórico (o es hoy, o fin de semana/feriado), consultar oficial actual
    if (usd <= 0 || eur <= 0) {
      try {
        const [resUsd, resEur] = await Promise.all([
          this.fetchWithTimeout('https://ve.dolarapi.com/v1/dolares/oficial'),
          this.fetchWithTimeout('https://ve.dolarapi.com/v1/euros/oficial'),
        ]);

        if (resUsd.ok) {
          const dataUsd = (await resUsd.json()) as { promedio?: number; venta?: number };
          if (usd <= 0) usd = Number(dataUsd.promedio ?? dataUsd.venta ?? 0);
        }
        if (resEur.ok) {
          const dataEur = (await resEur.json()) as { promedio?: number; venta?: number };
          if (eur <= 0) eur = Number(dataEur.promedio ?? dataEur.venta ?? 0);
        }
      } catch (err) {
        // Si no hay internet o la API falla, devolver 0 o valores previos
      }
    }

    return {
      usd: Math.round(usd * 10000) / 10000,
      eur: Math.round(eur * 10000) / 10000,
      date: targetDate,
      source: 'BCV',
    };
  }
}

