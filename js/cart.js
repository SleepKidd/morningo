
let cart=JSON.parse(localStorage.getItem('morningo')||'[]');
function addToCart(name,price){
let x=cart.find(i=>i.name===name);
x?x.qty++:cart.push({name,price,qty:1});
localStorage.setItem('morningo',JSON.stringify(cart));
alert('Добавлено');
}
