// define all UI variable
const navToggler = document.querySelector('.nav-toggler');
const navMenu = document.querySelector('.site-navbar ul');
const navLinks = document.querySelectorAll('.site-navbar a');

// load all event listners
allEventListners();

// functions of all event listners
function allEventListners() {
  // toggler icon click event
  navToggler.addEventListener('click', togglerClick);
  // nav links click event
  navLinks.forEach( elem => elem.addEventListener('click', navLinkClick));
}

// togglerClick function
function togglerClick() {
  navToggler.classList.toggle('toggler-open');
  navMenu.classList.toggle('open');
}

// navLinkClick function
function navLinkClick() {
  if(navMenu.classList.contains('open')) {
    navToggler.click();
  }
}

//navbar end







var fl = gsap.timeline({delay: 1});
gsap.from('.form-box--greencard', {
    opacity: 0,
    xPercent: 100,
    duration: 1.3,
    ease: "back.out(1.2)",
    delay: 0.5

})

fl.from('.header__home--animation', {
    opacity: 0,
    xPercent: -100,
    duration: 1.3,
    // ease: "back.out(1.2)",
    

})

fl.from('.form__home--animation', {
    opacity: 0,
    scale:0.2,
    duration: 1,
    // ease: "back.out(1.2)"

}, "-=1")



//about Scroll Trigger start
let tl = gsap.timeline({
    scrollTrigger: {
      trigger: ".section-about-company",
    //   markers: true,
      start: "18% bottom",
    //   end: "65% 70%",
      // toggleActions: "restart resume resume pause",
    },
  });

  tl.from('.section-about-company', {
    opacity: 0,
    xPercent: -100,
    duration: 1,
    // ease: "back.out(1.2)",
    

})

//facility animation

let tl2 = gsap.timeline({
    scrollTrigger: {
      trigger: ".section__save-time",
    //   markers: true,
      start: "-30% bottom",
    //   end: "65% 70%",
      // toggleActions: "restart resume resume pause",
    },
  });


  tl2.from('.facility__block', {
    opacity: 0,
    yPercent: 100,
    duration: 0.7,
    // ease: "back.out(1.2)",
    stagger: 0.2,
    
})  






