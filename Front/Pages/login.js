import { auth, db } from '../Configs/firebaseConfig.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { ui } from './dictionary.js';

if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
}

const loginBtn = document.getElementById('loginBtn');
const accInput = document.getElementById('acc');
const pwdInput = document.getElementById('pwd');
const showPwdCheckbox = document.getElementById('showPwd');

document.title = ui.login_title;
document.getElementById('loginTitle').innerText = ui.login_title;
loginBtn.innerText = ui.login_btn;
accInput.placeholder = ui.account;
pwdInput.placeholder = ui.password;

const showPwdLabel = document.querySelector('label[for="showPwd"]');
if (showPwdLabel) {
    showPwdLabel.innerText = ui.show_password;
}
showPwdCheckbox.onchange = () => {
    pwdInput.type = showPwdCheckbox.checked ? 'text' : 'password';
};

[accInput, pwdInput].forEach(input => {
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loginBtn.click();
        }
    });
});

loginBtn.onclick = async () => {
    const username = accInput.value.trim().toLowerCase();
    const password = pwdInput.value.trim();
    const virtualEmail = `${username}@piclog.app`;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, virtualEmail, password);
        
        localStorage.setItem("currentUser", JSON.stringify({
            username: username,
            loginTime: new Date().getTime()
        }));

        window.location.href = "index.html";
        return;
    } catch (error) {
        console.error("Login Error:", error);
        alert(ui.error_pwd || "Login Failed");
    }
};
