import { solicitar } from './api.js';

// Pide al servidor el enlace de WhatsApp. El mensaje y los precios se calculan allí.
export function solicitarPedido(items) {
  return solicitar('/api/pedidos/whatsapp', {
    method: 'POST',
    json: { items }
  });
}
