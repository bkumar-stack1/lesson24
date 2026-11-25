"use strict";

function paymentStatusLabel(status) {
    switch (status) {
        case "paid":
            return "決済済み";
        case "refunded":
            return "返金済み";
        case "refund_failed":
            return "返金失敗";
        case "unpaid":
        default:
            return "未決済";
    }
}

function showOrderMessage(text, isError = false) {
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

async function loadOrders() {
    const tbody = document.getElementById("order-items");
    try {
        const me = await fetch("/api/me");
        if (!me.ok) {
            tbody.innerHTML = '<tr><td colspan="8">自分の注文履歴を見るにはログインしてください。<a href="login.html">ログイン</a></td></tr>';
            return;
        }
        const response = await fetch("/api/orders");
        if (!response.ok) throw new Error("注文履歴の取得に失敗しました。");
        const orders = await response.json();
        tbody.textContent = "";
        if (!orders.length) {
            tbody.innerHTML = '<tr><td colspan="8">自分の注文履歴はありません。</td></tr>';
            return;
        }
        for (const item of orders) {
            const row = document.createElement("tr");
            const payLabel = paymentStatusLabel(item.payment_status);
            const values = [
                String(item.id),
                item.product_name,
                `¥${item.price.toLocaleString()}`,
                String(item.quantity),
                `¥${(item.price * item.quantity).toLocaleString()}`,
                payLabel,
                item.shipping_status
            ];
            for (const value of values) {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);
            }

            const actionCell = document.createElement("td");
            let hasAction = false;

            // '受付' かつ未決済なら「決済する」ボタン
            if (item.shipping_status === "受付" && item.payment_status === "unpaid") {
                const payLink = document.createElement("button");
                payLink.type = "button";
                payLink.textContent = "決済する";
                payLink.addEventListener("click", () => {
                    window.location.href = `payment.html?orders=${item.id}`;
                });
                actionCell.appendChild(payLink);
                hasAction = true;
            }

            // '受付' なら「キャンセル」ボタン
            if (item.shipping_status === "受付") {
                if (hasAction) actionCell.append(" ");
                const cancelBtn = document.createElement("button");
                cancelBtn.type = "button";
                cancelBtn.textContent = "キャンセル";
                cancelBtn.addEventListener("click", async () => {
                    if (!confirm(`注文ID ${item.id}（${item.product_name}）をキャンセルしますか？`)) return;
                    cancelBtn.disabled = true;
                    try {
                        const res = await fetch("/api/orders/cancel", {
                            method: "POST",
                            headers: {"Content-Type": "application/json"},
                            body: JSON.stringify({order_id: item.id})
                        });
                        if (!res.ok) {
                            const errText = (await res.text()).trim();
                            throw new Error(errText || "キャンセルに失敗しました。");
                        }
                        showOrderMessage(`注文ID ${item.id} をキャンセルしました。`);
                        await loadOrders();
                    } catch (err) {
                        showOrderMessage(err.message, true);
                        cancelBtn.disabled = false;
                    }
                });
                actionCell.appendChild(cancelBtn);
                hasAction = true;
            }

            // '発送済み' かつ決済済みなら「返品申請」ボタン
            if (item.shipping_status === "発送済み" && item.payment_status === "paid") {
                if (hasAction) actionCell.append(" ");
                const returnBtn = document.createElement("button");
                returnBtn.type = "button";
                returnBtn.textContent = "返品申請";
                returnBtn.addEventListener("click", async () => {
                    if (!confirm(`注文ID ${item.id}（${item.product_name}）の返品を申請しますか？`)) return;
                    returnBtn.disabled = true;
                    try {
                        const res = await fetch("/api/orders/return", {
                            method: "POST",
                            headers: {"Content-Type": "application/json"},
                            body: JSON.stringify({order_id: item.id})
                        });
                        if (!res.ok) {
                            const errText = (await res.text()).trim();
                            throw new Error(errText || "返品申請に失敗しました。");
                        }
                        showOrderMessage(`注文ID ${item.id} の返品を申請しました。`);
                        await loadOrders();
                    } catch (err) {
                        showOrderMessage(err.message, true);
                        returnBtn.disabled = false;
                    }
                });
                actionCell.appendChild(returnBtn);
                hasAction = true;
            }

            if (!hasAction) {
                actionCell.textContent = "－";
            }

            row.appendChild(actionCell);
            tbody.appendChild(row);
        }
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="8">注文履歴の取得に失敗しました。</td></tr>';
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadOrders();
});