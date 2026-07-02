// Data: Incluye el logo y el nombre. Ya NO incluye profileLink.
const socialData = [
    {
        name: "tiktok",
        url: "https://img.freepik.com/vector-premium/logotipo-tik-tok_578229-290.jpg?semt=ais_hybrid&w=740&q=80",
        user: "MakacaGotica"
    },
    {
        name: "instagram",
        url: "https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg",
        user: "MakacaGotica"
    },
    // *** NUEVA RED SOCIAL AÑADIDA ***
    {
        name: "youtube",
        url: "https://goodly.co.in/wp-content/uploads/2023/10/youtube-logo-png-46016-1.png", // URL del logo de YouTube
        user: "MakacaGotica" // Tu nombre de usuario o canal de YouTube
    }
];

const iconBox = document.querySelector(".social-icon");
const userText = document.querySelector(".social-user");
let index = 0;

function showIcon(i) {
    iconBox.innerHTML = "";
    
    const data = socialData[i];
    
    // 1. GESTIÓN DEL LOGO
    const logoImg = document.createElement('img');
    logoImg.src = data.url;
    logoImg.alt = `${data.name} logo`;
    iconBox.appendChild(logoImg);

    gsap.fromTo(
        logoImg,
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.7)" }
    );
    
    // 2. GESTIÓN DEL TEXTO (Rotación horizontal)
    gsap.to(userText, {
        opacity: 0,
        x: 5,
        duration: 0.2,
        onComplete: () => {
            userText.textContent = data.user;
            gsap.fromTo(
                userText,
                { opacity: 0, x: -5 },
                { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" }
            );
        }
    });
}


showIcon(index);

// Configura la rotación automática cada 3 segundos (3000ms)
setInterval(() => {
    index = (index + 1) % socialData.length;
    showIcon(index);
}, 3000);
