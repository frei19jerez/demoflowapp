document.addEventListener('DOMContentLoaded', () => {

  console.log('🚀 Landing IA iniciada');

  // =========================
  // EFECTO SCROLL NAVBAR
  // =========================

  const navbar = document.querySelector('.navbar');

  window.addEventListener('scroll', () => {

    if(window.scrollY > 50){

      navbar.style.background = 'rgba(5,8,22,0.95)';
      navbar.style.boxShadow = '0 10px 30px rgba(0,0,0,0.4)';

    }else{

      navbar.style.background = 'rgba(10,10,20,0.7)';
      navbar.style.boxShadow = 'none';

    }

  });

  // =========================
  // BOTONES
  // =========================

  const botones = document.querySelectorAll('button');

  botones.forEach(btn => {

    btn.addEventListener('mouseenter', () => {

      btn.style.transform = 'scale(1.05)';

    });

    btn.addEventListener('mouseleave', () => {

      btn.style.transform = 'scale(1)';

    });

  });

  // =========================
  // ANIMACIÓN CONTADOR
  // =========================

  const counters = document.querySelectorAll('.counter');

  counters.forEach(counter => {

    const updateCounter = () => {

      const target = +counter.getAttribute('data-target');

      const current = +counter.innerText;

      const increment = target / 100;

      if(current < target){

        counter.innerText = `${Math.ceil(current + increment)}`;

        setTimeout(updateCounter, 25);

      }else{

        counter.innerText = target;

      }

    };

    updateCounter();

  });

  // =========================
  // SCROLL SUAVE
  // =========================

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {

    anchor.addEventListener('click', function (e) {

      e.preventDefault();

      const destino = document.querySelector(this.getAttribute('href'));

      if(destino){

        destino.scrollIntoView({
          behavior: 'smooth'
        });

      }

    });

  });

  // =========================
  // MENSAJE IA
  // =========================

  setTimeout(() => {

    console.log('🤖 IA DemoFlow activa');

  }, 2000);

});