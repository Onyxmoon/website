(function () {
    const el = document.getElementById("contact-mail");
    if (!el) return;

    const user = "mail";
    const site = "philippborucki.me";
    const addr = `${user}@${site}`;

    const label = document.createTextNode("Mail: ");
    const a = document.createElement("a");
    a.href = `mailto:${addr}`;
    a.textContent = addr;

    el.appendChild(label);
    el.appendChild(a);
})();