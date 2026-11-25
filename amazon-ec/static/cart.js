document.addEventListener("DOMContentLoaded", () => {
    displayCart();
    const checkoutBtn = document.getElementById("checkout-btn");
    if (checkoutBtn) {
        checkoutBtn.onclick = () => checkoutCart();
    }
});

function showCartMessage(text, isError = false) {
    const msgDiv = document.getElementById("message");
    if (!msgDiv) return;
    msgDiv.textContent = text;
    msgDiv.style.display = "block";
    if (isError) {
        msgDiv.style.backgroundColor = "#fdecea";
        msgDiv.style.color = "#b71c1c";
    } else {
        msgDiv.style.backgroundColor = "#e7f4e4";
        msgDiv.style.color = "#2e7d32";
    }
}

function displayCart() {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const cartItemsTbody = document.getElementById("cart-items");
    const cartTotalHeader = document.getElementById("cart-total");
    cartItemsTbody.innerHTML = "";

    if (cart.length === 0) {
        cartItemsTbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center;">カートに商品が入っていません。</td>
            </tr>
        `;
        cartTotalHeader.innerText = "合計: ¥0";
        return;
    }

    let total = 0;
    cart.forEach(item => {
        const subtotal = item.price * item.quantity;
        total += subtotal;
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${escapeHtml(item.name)}</td>
            <td style="text-align: right;">¥${item.price.toLocaleString()}</td>
            <td style="text-align: center;">${item.quantity}</td>
            <td style="text-align: right;">¥${subtotal.toLocaleString()}</td>
        `;
        cartItemsTbody.appendChild(row);
    });

    cartTotalHeader.innerText = `合計: ¥${total.toLocaleString()}`;
}

async function checkoutCart() {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    if (cart.length === 0) {
        showCartMessage("カートが空です。", true);
        return;
    }

    const checkoutBtn = document.getElementById("checkout-btn");
    const msgDiv = document.getElementById("message");
    if (msgDiv) {
        msgDiv.style.display = "none";
        msgDiv.textContent = "";
    }

    checkoutBtn.disabled = true;
    const orderIds = [];
    try {
        for (const item of cart) {
            const response = await fetch("/api/orders", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({product_id: item.id, quantity: item.quantity})
            });
            if (!response.ok) {
                const errText = (await response.text()).trim();
                throw new Error(errText || `注文登録に失敗しました（HTTP ${response.status}）`);
            }
            const data = await response.json();
            if (!Number.isSafeInteger(data.id) || data.id <= 0) throw new Error("注文ID取得失敗");
            orderIds.push(data.id);
        }
        // 決済完了までカートは消さない
        window.location.href = `payment.html?orders=${orderIds.join(",")}&cart=1`;
    } catch (error) {
        console.error(error);
        const errMessage = error.message || "注文処理中にエラーが発生しました。";
        // 登録済みの注文を再登録しないよう、成功分は決済画面へ進む
        if (orderIds.length > 0) {
            showCartMessage(`${errMessage}（一部の注文のみ登録されたため、登録済みの注文の決済画面へ移動します）`, true);
            setTimeout(() => {
                window.location.href = `payment.html?orders=${orderIds.join(",")}&cart=1`;
            }, 1500);
        } else {
            showCartMessage(errMessage, true);
            checkoutBtn.disabled = false;
        }
    }
}

function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>"']/g, function(m) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[m];
    });
}