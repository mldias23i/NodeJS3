const deleteProduct = (btn) => {
    // Get the product ID and CSRF token from the HTML elements
   const prodId = btn.parentNode.querySelector('[name=productId]').value;
   const csrf = btn.parentNode.querySelector('[name=_csrf]').value;

   // Find the closest product element in the HTML structure
   const productElement = btn.closest('article');

   // Send a DELETE request to the server to delete the product
   fetch('/admin/product/' + prodId, {
    method: 'DELETE',
    headers: {
        'csrf-token': csrf
    }
   })
   .then(result => {
        return result.json();
    })
    .then(data => {
        console.log(data);
        // Remove the product element from the DOM
        productElement.parentNode.removeChild(productElement);
    })
   .catch(err => {
    console.log(err);
   });
};