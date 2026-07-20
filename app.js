// --- DATA: GREEN BUCKET MANDI MENU DATABASE ---
const MENU_ITEMS = [
    { id: 1, name: 'single Chicken fry Mandi', price: 189, category: 'Food' },
    { id: 2, name: 'full Chicken fry Mandi', price: 350, category: 'Food' },
    { id: 3, name: 'single mutton fry Mandi', price: 220, category: 'Food' },
    { id: 4, name: 'full mutton fry Mandi', price: 250, category: 'Food' },
    { id: 5, name: 'full fish Mandi', price: 400, category: 'Food' },
    { id: 6, name: 'Paneer Tikka curry', price: 149, category: 'Food' },
    { id: 7, name: 'Butter Chicken', price: 149, category: 'Food' },
    { id: 8, name: 'Rumali roti', price: 25, category: 'Food' },
    { id: 9, name: 'Garlic Naan', price: 30, category: 'Food' },
    { id: 10, name: 'Thumbs up - 250ml', price: 30, category: 'Drinks' },
    { id: 11, name: 'Pepsi - 250ml', price: 30, category: 'Drinks' }
];

let orderCart = [];
const TAX_RATE = 0.18; // 18% GST
let paymentTimeoutId = null; // Holds our simulated network timer reference

document.addEventListener('DOMContentLoaded', () => {
    // Core Layout DOM Hooks
    const menuGrid = document.getElementById('menu-grid');
    const receiptItemsContainer = document.getElementById('receipt-items');
    const emptyStateEl = document.getElementById('empty-state');
    const subtotalEl = document.getElementById('bill-subtotal');
    const taxEl = document.getElementById('bill-tax');
    const totalEl = document.getElementById('bill-total');
    const btnCheckout = document.getElementById('btn-checkout');

    // --- AUTOMATIC MODAL INJECTOR ---
    // Injects an advanced modal layout that supports both "Awaiting Scan" and "Success" visual states.
    let invoiceModal = document.getElementById('invoice-modal');
    if (!invoiceModal) {
        const modalHTML = `
            <div id="invoice-modal" class="fixed inset-0 bg-black/85 backdrop-blur-sm hidden items-center justify-center z-50 p-4">
                <div id="modal-card" class="bg-gray-900 border border-gray-800 p-6 rounded-2xl max-w-sm w-full text-center space-y-4 shadow-2xl transition-all duration-300">
                    
                    <h3 id="modal-title" class="text-xl font-black text-amber-500 tracking-tight">GREEN BUCKET MANDI</h3>
                    <p id="modal-subtitle" class="text-xs font-mono text-gray-400">Digital Payment Terminal</p>
                    <hr class="border-gray-800">
                    
                    <div class="font-mono bg-gray-950 p-4 rounded-xl space-y-1 text-sm border border-gray-850">
                        <div class="flex justify-between text-gray-400"><span>Total Bill:</span> <span id="modal-amount">₹0.00</span></div>
                        <div class="flex justify-between text-gray-400"><span>Status:</span> <span id="modal-status" class="text-emerald-400 animate-pulse font-bold">AWAITING SCAN</span></div>
                    </div>
                    
                    <div id="modal-graphic-wrapper" class="bg-white p-3 rounded-xl inline-block shadow-md mx-auto transition-all duration-300">
                        <img id="qr-code-img" src="" alt="UPI Pay QR" class="w-48 h-48 block object-contain">
                    </div>
                    
                    <p id="modal-footer-text" class="text-[11px] text-gray-400 font-sans px-2">Scan securely using GPay, PhonePe, Paytm, or any UPI app to complete payment.</p>
                    
                    <button id="btn-close-modal" class="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-2.5 px-4 rounded-xl transition-colors cursor-pointer text-sm">
                        Cancel & Close
                    </button>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        invoiceModal = document.getElementById('invoice-modal');
    }

    const modalCard = document.getElementById('modal-card');
    const modalTitle = document.getElementById('modal-title');
    const modalSubtitle = document.getElementById('modal-subtitle');
    const modalStatus = document.getElementById('modal-status');
    const modalGraphicWrapper = document.getElementById('modal-graphic-wrapper');
    const modalFooterText = document.getElementById('modal-footer-text');
    const modalAmount = document.getElementById('modal-amount');
    const qrCodeImg = document.getElementById('qr-code-img');
    const btnCloseModal = document.getElementById('btn-close-modal');

    let runningGrossTotal = 0;

    // 1. Render Menu Items Grid
    function initMenu() {
        if (!menuGrid) return;
        menuGrid.innerHTML = ''; 
        MENU_ITEMS.forEach(item => {
            const cardHTML = `
                <div class="bg-gray-900 border border-gray-800 hover:border-amber-500/50 p-4 rounded-xl text-left flex flex-col justify-between group transition-all duration-200 shadow-md">
                    <div>
                        <span class="text-xs font-mono text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">${item.category}</span>
                        <h4 class="font-bold text-gray-200 group-hover:text-white transition-colors mt-2 text-sm leading-tight">${item.name}</h4>
                    </div>
                    <div class="flex justify-between items-center mt-4">
                        <p class="text-base font-extrabold text-white font-mono">₹${item.price}</p>
                        <button onclick="window.addToOrder(${item.id})" class="bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold py-1 px-3 rounded-lg text-xs cursor-pointer transition-all active:scale-95">Add</button>
                    </div>
                </div>
            `;
            menuGrid.insertAdjacentHTML('beforeend', cardHTML);
        });
        
        const dateEl = document.getElementById('bill-date');
        if (dateEl) dateEl.textContent = `Date: ${new Date().toLocaleDateString('en-IN')}`;
    }

    // 2. Global Add Function
    window.addToOrder = function(id) {
        const targetProduct = MENU_ITEMS.find(item => item.id === id);
        const existingOrderItem = orderCart.find(cartItem => cartItem.id === id);

        if (existingOrderItem) {
            existingOrderItem.quantity += 1;
        } else {
            orderCart.push({ ...targetProduct, quantity: 1 });
        }
        updateBillingSystem();
    };

    // 3. Global Remove Function
    window.removeFromOrder = function(id) {
        const existingOrderItem = orderCart.find(cartItem => cartItem.id === id);
        if (existingOrderItem.quantity > 1) {
            existingOrderItem.quantity -= 1;
        } else {
            orderCart = orderCart.filter(cartItem => cartItem.id !== id);
        }
        updateBillingSystem();
    };

    // 4. Update Receipt Calculation Engine
    function updateBillingSystem() {
        receiptItemsContainer.innerHTML = '';

        if (orderCart.length === 0) {
            receiptItemsContainer.appendChild(emptyStateEl);
            subtotalEl.textContent = '₹0.00';
            taxEl.textContent = '₹0.00';
            totalEl.textContent = '₹0.00';
            runningGrossTotal = 0;
            return;
        }

        let currentSubtotal = 0;
        
        orderCart.forEach(item => {
            const itemCost = item.price * item.quantity;
            currentSubtotal += itemCost;

            const rowHTML = `
                <div class="flex justify-between items-center bg-gray-950/50 p-2.5 border border-gray-800 rounded-lg">
                    <div class="max-w-[65%]">
                        <p class="font-bold text-gray-200 text-xs truncate">${item.name}</p>
                        <p class="text-xs text-gray-500">₹${item.price} × ${item.quantity}</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="font-bold text-gray-300">₹${itemCost}</span>
                        <button onclick="window.removeFromOrder(${item.id})" class="text-rose-500 hover:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 px-2 py-0.5 rounded text-xs cursor-pointer transition-colors">
                            Remove
                        </button>
                    </div>
                </div>
            `;
            receiptItemsContainer.insertAdjacentHTML('beforeend', rowHTML);
        });

        const calculatedTax = currentSubtotal * TAX_RATE;
        runningGrossTotal = currentSubtotal + calculatedTax;

        subtotalEl.textContent = `₹${currentSubtotal.toFixed(2)}`;
        taxEl.textContent = `₹${calculatedTax.toFixed(2)}`;
        totalEl.textContent = `₹${runningGrossTotal.toFixed(2)}`;
    }

    // 5. Checkout Action -> Displays local photo and sets success verification hook timer
    if (btnCheckout) {
        btnCheckout.addEventListener('click', () => {
            if (orderCart.length === 0) {
                alert("Cannot process checkout. The bill is completely empty.");
                return;
            }

            // Reset modal styles to default awaiting state
            resetModalToAwaitingState();

            modalAmount.textContent = `₹${runningGrossTotal.toFixed(2)}`;
            qrCodeImg.src = 'QR_UPI_Madhu.jpeg'; 

            // Reveal modal overlay layout
            invoiceModal.classList.remove('hidden');
            invoiceModal.classList.add('flex');

            // ⏳ TRIGGER THE PAYMENT SIMULATION: Executes success transition after 5 seconds
            paymentTimeoutId = setTimeout(() => {
                transitionModalToPaymentSuccess();
            }, 25000);
        });
    }

    // 6. Close Modal & Reset State Array completely
    if (btnCloseModal) {
        btnCloseModal.addEventListener('click', () => {
            // Clear any active running timeouts to prevent background executions
            if (paymentTimeoutId) clearTimeout(paymentTimeoutId);

            invoiceModal.classList.remove('flex');
            invoiceModal.classList.add('hidden');
            
            orderCart = [];
            updateBillingSystem();
        });
    }

    // --- MUTATION: RESET TO DEFAULT QR AWAITING SCREEN ---
    function resetModalToAwaitingState() {
        modalCard.className = "bg-gray-900 border border-gray-800 p-6 rounded-2xl max-w-sm w-full text-center space-y-4 shadow-2xl transition-all duration-300";
        modalTitle.textContent = "GREEN BUCKET MANDI";
        modalTitle.className = "text-xl font-black text-amber-500 tracking-tight";
        modalSubtitle.textContent = "Digital Payment Terminal";
        modalStatus.textContent = "AWAITING SCAN";
        modalStatus.className = "text-emerald-400 animate-pulse font-bold";
        
        modalGraphicWrapper.className = "bg-white p-3 rounded-xl inline-block shadow-md mx-auto transition-all duration-350 transform scale-100";
        qrCodeImg.className = "w-48 h-48 block object-contain";
        
        modalFooterText.textContent = "Scan securely using GPay, PhonePe, Paytm, or any UPI app to complete payment.";
        modalFooterText.className = "text-[11px] text-gray-400 font-sans px-2";
        btnCloseModal.textContent = "Cancel & Close";
    }

    // --- MUTATION: DYNAMICALLY TRANSITION MODAL TO PAYMENT SUCCESS STATE ---
    function transitionModalToPaymentSuccess() {
        // 1. Structural Card Glow Mutation
        modalCard.className = "bg-gray-900 border border-emerald-500/40 p-6 rounded-2xl max-w-sm w-full text-center space-y-4 shadow-2xl shadow-emerald-950/30 transition-all duration-300";
        
        // 2. Adjust State Status Indicators
        modalTitle.textContent = "PAYMENT RECEIVED";
        modalTitle.className = "text-xl font-black text-emerald-400 tracking-tight";
        modalSubtitle.textContent = "Transaction Token: #GBM-" + Math.floor(100000 + Math.random() * 900000);
        modalStatus.textContent = "PAID SUCCESSFUL";
        modalStatus.className = "text-emerald-400 font-black tracking-wide";

        // 3. Transform QR Image slot into a beautifully stylized Green Checkmark graphic natively via SVG string string
        modalGraphicWrapper.className = "bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-full inline-block mx-auto transition-all duration-350 transform scale-110 shadow-inner";
        modalGraphicWrapper.innerHTML = `
            <svg class="w-16 h-16 text-emerald-400" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>
            </svg>
        `;

        // 4. Update contextual footnotes and button actions
        modalFooterText.textContent = "Order sent to Green Bucket Mandi kitchen terminal. Print invoice duplicate generated.";
        modalFooterText.className = "text-xs font-medium text-emerald-500/80 px-2";
        btnCloseModal.textContent = "Complete Order & Clear Terminal";
    }

    initMenu();
});