const backdrop = document.querySelector('.backdrop');
const sideDrawer = document.querySelector('.mobile-nav');
const menuToggle = document.querySelector('#side-menu-toggle');

/*
 Handles the click event on the backdrop element.
 Sets the display of the backdrop to 'none' and removes the 'open' class from the side drawer.
*/
function backdropClickHandler() {
  backdrop.style.display = 'none';
  sideDrawer.classList.remove('open');
}

/*
 Handles the click event on the menu toggle button.
 Sets the display of the backdrop to 'block' and adds the 'open' class to the side drawer.
 */
function menuToggleClickHandler() {
  backdrop.style.display = 'block';
  sideDrawer.classList.add('open');
}

backdrop.addEventListener('click', backdropClickHandler);
menuToggle.addEventListener('click', menuToggleClickHandler);
