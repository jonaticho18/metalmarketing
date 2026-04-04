/* ============================================
   METAL MARKETING - ECOMMERCE TRACKING LAB
   
   Este archivo contiene:
   1. Datos de productos (catálogo)
   2. Lógica del carrito (localStorage)
   3. Data Layer pushes para GA4 ecommerce
   4. Monitor visual del Data Layer
   
   NOTA PARA JONATHAN:
   - Cada función de dataLayer está comentada
   - El monitor visual te muestra en tiempo real
     qué se pushea al dataLayer
   - Esto es exactamente lo que GTM4WP haría
     automáticamente en WooCommerce
   ============================================ */

// ============================================
// 1. CATÁLOGO DE PRODUCTOS
// ============================================
const PRODUCTS = [
  {
    item_id: "MM-ADS-101",
    item_name: "Meta Ads Dominio Total",
    item_brand: "Metal Marketing",
    item_category: "Cursos",
    item_category2: "Paid Media",
    item_variant: "Online",
    price: 49900,
    emoji: "🎯",
    level: "Intermedio",
    description: "Domina Meta Ads desde la estructura de campañas hasta la optimización avanzada. Audiencias, creativos, retargeting y reporting.",
    features: [
      "12 módulos en video (8+ horas)",
      "Templates de campañas descargables",
      "Estructura de testing A/B incluida",
      "Acceso a comunidad privada",
      "Certificado de finalización"
    ]
  },
  {
    item_id: "MM-GTM-201",
    item_name: "GTM & Analytics Pro",
    item_brand: "Metal Marketing",
    item_category: "Cursos",
    item_category2: "Tracking & Data",
    item_variant: "Online",
    price: 69900,
    emoji: "📊",
    level: "Avanzado",
    description: "Google Tag Manager, GA4, Data Layer, Enhanced Conversions y Server-Side Tagging. Todo lo que necesitas para tracking profesional.",
    features: [
      "15 módulos técnicos paso a paso",
      "Laboratorio práctico con sitio de testing",
      "Templates de GTM importables",
      "Módulo de Server-Side GTM + Meta CAPI",
      "Soporte técnico por 60 días"
    ]
  },
  {
    item_id: "MM-FUN-301",
    item_name: "Funnels que Convierten",
    item_brand: "Metal Marketing",
    item_category: "Cursos",
    item_category2: "Funnels",
    item_variant: "Online",
    price: 39900,
    emoji: "🔥",
    level: "Principiante",
    description: "Aprende a crear embudos de venta completos: landing pages, secuencias de email, lead magnets y automatizaciones con GoHighLevel.",
    features: [
      "10 módulos prácticos",
      "3 templates de funnel descargables",
      "Integración con WhatsApp Business",
      "Módulo de copywriting para landing pages",
      "Bonus: Automatizaciones con Make"
    ]
  },
  {
    item_id: "MM-AI-401",
    item_name: "AI para Marketers",
    item_brand: "Metal Marketing",
    item_category: "Cursos",
    item_category2: "AI & Automation",
    item_variant: "Online",
    price: 59900,
    emoji: "🤖",
    level: "Intermedio",
    description: "Usa Claude, ChatGPT y herramientas de AI para producir campañas 10x más rápido. Prompts, workflows y automatizaciones reales.",
    features: [
      "8 módulos con casos reales",
      "Biblioteca de 50+ prompts para marketing",
      "Workflows de MAKE con AI integrada",
      "Generación de reportes con AI",
      "Módulo de AI + Google Sheets"
    ]
  }
];

// ============================================
// 2. UTILIDADES
// ============================================
function formatPrice(price) {
  return new Intl.NumberFormat('es-AR').format(price);
}

function getProduct(id) {
  return PRODUCTS.find(p => p.item_id === id);
}

function generateTransactionId() {
  return 'MM-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
}

function generateEventId() {
  return 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ============================================
// 3. CARRITO (localStorage)
// ============================================
function getCart() {
  try {
    return JSON.parse(localStorage.getItem('mm_cart') || '[]');
  } catch { return []; }
}

function saveCart(cart) {
  localStorage.setItem('mm_cart', JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(productId) {
  const product = getProduct(productId);
  if (!product) return;
  
  let cart = getCart();
  const exists = cart.find(item => item.item_id === productId);
  
  if (!exists) {
    cart.push({ ...product, quantity: 1 });
    saveCart(cart);
    
    // ========================================
    // DATA LAYER: add_to_cart
    // Este evento le dice a GA4 que el usuario
    // agregó un producto al carrito.
    // Es CRÍTICO para remarketing y para
    // medir la tasa de add-to-cart.
    // ========================================
    pushToDataLayer({
      event: "add_to_cart",
      ecommerce: {
        currency: "ARS",
        value: product.price,
        items: [formatItem(product)]
      }
    });
    
    showNotification(`"${product.item_name}" agregado al carrito`);
  } else {
    showNotification("Este curso ya está en tu carrito");
  }
}

function removeFromCart(productId) {
  const product = getProduct(productId);
  let cart = getCart();
  cart = cart.filter(item => item.item_id !== productId);
  saveCart(cart);
  
  if (product) {
    // ========================================
    // DATA LAYER: remove_from_cart
    // Trackear qué productos quitan del carrito
    // te ayuda a entender fricción y objeciones.
    // ========================================
    pushToDataLayer({
      event: "remove_from_cart",
      ecommerce: {
        currency: "ARS",
        value: product.price,
        items: [formatItem(product)]
      }
    });
  }
}

function getCartTotal() {
  return getCart().reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.quantity, 0);
}

function clearCart() {
  localStorage.removeItem('mm_cart');
  updateCartBadge();
}

function updateCartBadge() {
  const badges = document.querySelectorAll('.cart-count');
  const count = getCartCount();
  badges.forEach(badge => {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  });
}

// ============================================
// 4. DATA LAYER FUNCTIONS
// Estas son las funciones que pushean eventos
// al dataLayer. En un ecommerce real con
// WooCommerce, el plugin GTM4WP hace esto
// automáticamente. Aquí lo hacemos manual
// para que entiendas exactamente qué se envía.
// ============================================

// Inicializar dataLayer si no existe
window.dataLayer = window.dataLayer || [];

function formatItem(product, index) {
  return {
    item_id: product.item_id,
    item_name: product.item_name,
    item_brand: product.item_brand || "Metal Marketing",
    item_category: product.item_category || "Cursos",
    item_category2: product.item_category2 || "",
    item_variant: product.item_variant || "Online",
    price: product.price,
    quantity: product.quantity || 1,
    index: index || 0
  };
}

function pushToDataLayer(data) {
  // SIEMPRE limpiar ecommerce antes de nuevo push
  // Esto previene que datos de eventos anteriores
  // se mezclen con el evento actual
  window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push(data);
  
  // Actualizar el monitor visual
  logToMonitor(data);
}

// ========================================
// DATA LAYER: view_item_list
// Se dispara cuando el usuario ve una lista
// de productos (página de catálogo).
// ========================================
function trackViewItemList(products, listName) {
  pushToDataLayer({
    event: "view_item_list",
    ecommerce: {
      item_list_id: listName.toLowerCase().replace(/\s/g, '_'),
      item_list_name: listName,
      items: products.map((p, i) => formatItem(p, i))
    }
  });
}

// ========================================
// DATA LAYER: view_item
// Se dispara cuando el usuario ve el detalle
// de un producto específico.
// ========================================
function trackViewItem(product) {
  pushToDataLayer({
    event: "view_item",
    ecommerce: {
      currency: "ARS",
      value: product.price,
      items: [formatItem(product)]
    }
  });
}

// ========================================
// DATA LAYER: view_cart
// Se dispara cuando el usuario ve su carrito.
// Indica intención de compra.
// ========================================
function trackViewCart() {
  const cart = getCart();
  if (cart.length === 0) return;
  
  pushToDataLayer({
    event: "view_cart",
    ecommerce: {
      currency: "ARS",
      value: getCartTotal(),
      items: cart.map((item, i) => formatItem(item, i))
    }
  });
}

// ========================================
// DATA LAYER: begin_checkout
// Se dispara cuando el usuario empieza el
// proceso de checkout. Alta intención de compra.
// ========================================
function trackBeginCheckout() {
  const cart = getCart();
  pushToDataLayer({
    event: "begin_checkout",
    ecommerce: {
      currency: "ARS",
      value: getCartTotal(),
      items: cart.map((item, i) => formatItem(item, i))
    }
  });
}

// ========================================
// DATA LAYER: add_shipping_info
// Se dispara cuando el usuario completa
// la información de envío/contacto.
// ========================================
function trackAddShippingInfo() {
  const cart = getCart();
  pushToDataLayer({
    event: "add_shipping_info",
    ecommerce: {
      currency: "ARS",
      value: getCartTotal(),
      shipping_tier: "Digital - Acceso inmediato",
      items: cart.map((item, i) => formatItem(item, i))
    }
  });
}

// ========================================
// DATA LAYER: add_payment_info
// Se dispara cuando el usuario selecciona
// o completa su método de pago.
// ========================================
function trackAddPaymentInfo(paymentMethod) {
  const cart = getCart();
  pushToDataLayer({
    event: "add_payment_info",
    ecommerce: {
      currency: "ARS",
      value: getCartTotal(),
      payment_type: paymentMethod || "Tarjeta de crédito",
      items: cart.map((item, i) => formatItem(item, i))
    }
  });
}

// ========================================
// DATA LAYER: purchase
// ¡LA CONVERSIÓN PRINCIPAL!
// Se dispara cuando se completa la compra.
// transaction_id DEBE ser único para evitar
// duplicados si el usuario recarga la página.
// ========================================
function trackPurchase(transactionId) {
  const cart = getCart();
  const total = getCartTotal();
  
  pushToDataLayer({
    event: "purchase",
    ecommerce: {
      transaction_id: transactionId || generateTransactionId(),
      value: total,
      tax: 0,
      shipping: 0,
      currency: "ARS",
      coupon: "",
      items: cart.map((item, i) => formatItem(item, i))
    }
  });
}

// ============================================
// 5. MONITOR VISUAL DEL DATA LAYER
// Este widget te muestra en tiempo real qué
// eventos se están pusheando al dataLayer.
// En producción esto NO existiría — es solo
// para tu aprendizaje y debugging.
// ============================================
let monitorMinimized = false;
let eventLog = [];

function createMonitor() {
  const monitor = document.createElement('div');
  monitor.className = 'dl-monitor';
  monitor.id = 'dl-monitor';
  monitor.innerHTML = `
    <div class="dl-monitor-header" onclick="toggleMonitor()">
      <span>⚡ Data Layer Monitor</span>
      <button class="dl-monitor-toggle" id="monitor-toggle">−</button>
    </div>
    <div class="dl-monitor-body" id="dl-monitor-body">
      <div style="color: #8b949e; font-size: 11px; padding: 8px; text-align: center;">
        Esperando eventos del Data Layer...
      </div>
    </div>
  `;
  document.body.appendChild(monitor);
  
  // Badge de tracking
  const badge = document.createElement('div');
  badge.className = 'tracking-badge';
  badge.innerHTML = `
    <div class="dot"></div>
    <span>TRACKING LAB ACTIVO</span>
  `;
  document.body.appendChild(badge);
}

function toggleMonitor() {
  const body = document.getElementById('dl-monitor-body');
  const toggle = document.getElementById('monitor-toggle');
  monitorMinimized = !monitorMinimized;
  body.style.display = monitorMinimized ? 'none' : 'block';
  toggle.textContent = monitorMinimized ? '+' : '−';
}

function logToMonitor(data) {
  const body = document.getElementById('dl-monitor-body');
  if (!body) return;
  
  // Skip the ecommerce: null cleanup pushes
  if (data.ecommerce === null && !data.event) return;
  
  const isEcommerce = data.ecommerce && data.event;
  const div = document.createElement('div');
  div.className = 'dl-event' + (isEcommerce ? ' ecommerce' : '');
  
  const time = new Date().toLocaleTimeString('es-AR');
  let details = '';
  
  if (data.ecommerce) {
    const e = data.ecommerce;
    if (e.value) details += `Value: $${formatPrice(e.value)} ARS\n`;
    if (e.transaction_id) details += `TX: ${e.transaction_id}\n`;
    if (e.items) details += `Items: ${e.items.length} producto(s)\n`;
    if (e.items) {
      e.items.forEach(item => {
        details += `  → ${item.item_name} ($${formatPrice(item.price)})\n`;
      });
    }
  }
  
  div.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <span class="dl-event-name">${data.event || 'push'}</span>
      <span style="color:#484f58;font-size:10px;">${time}</span>
    </div>
    ${details ? `<div class="dl-event-data">${details}</div>` : ''}
  `;
  
  // Remove placeholder
  if (body.querySelector('div[style*="text-align: center"]')) {
    body.innerHTML = '';
  }
  
  body.insertBefore(div, body.firstChild);
}

// ============================================
// 6. UI HELPERS
// ============================================
function showNotification(message) {
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();
  
  const notif = document.createElement('div');
  notif.className = 'notification';
  notif.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 10000;
    background: #111118; border: 1px solid #22c55e; border-radius: 10px;
    padding: 14px 20px; color: #f0f0f5; font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    box-shadow: 0 8px 30px rgba(0,0,0,0.4);
    animation: slideIn 0.3s ease;
    display: flex; align-items: center; gap: 10px;
  `;
  notif.innerHTML = `<span style="color:#22c55e;font-size:18px;">✓</span> ${message}`;
  document.body.appendChild(notif);
  
  setTimeout(() => {
    notif.style.opacity = '0';
    notif.style.transform = 'translateX(20px)';
    notif.style.transition = 'all 0.3s ease';
    setTimeout(() => notif.remove(), 300);
  }, 3000);
}

function renderNav() {
  return `
    <nav class="nav">
      <a href="index.html" class="nav-brand">
        <span>METAL MARKETING</span>
        <span class="nav-badge">Tracking Lab</span>
      </a>
      <div class="nav-links">
        <a href="index.html">Cursos</a>
        <a href="carrito.html" class="cart-icon">
          🛒 <span class="cart-count" style="display:none">0</span>
        </a>
      </div>
    </nav>
  `;
}

// Init on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  createMonitor();
  updateCartBadge();
});

// Add CSS animation
const style = document.createElement('style');
style.textContent = `@keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }`;
document.head.appendChild(style);
