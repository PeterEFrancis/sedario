


const WIDTH = 1000;
const HEIGHT = 400;


function get_zero(a, b) {
  return Math.abs(a) / (Math.abs(a) + Math.abs(b));
}


function draw_polygon(ctx, poly) {
  ctx.fillStyle = poly[1].y > 0 ? 'white' : 'black';
  ctx.beginPath();
  ctx.moveTo((poly[0].x) * WIDTH / 64, HEIGHT / 2 - poly[0].y);
  for (let i = 1; i < poly.length; i++) {
    ctx.lineTo((poly[i].x) * WIDTH / 64, HEIGHT / 2 - poly[i].y);
  }
  ctx.closePath();
  ctx.fill();
}


function get_graph(data) {

  let canvas = document.createElement('canvas');
  let ctx = canvas.getContext('2d');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  let m = Math.max(...data.map(x => Math.abs(x)));
  let normalized = data.map(x => 0.45 * HEIGHT * x / m);

  ctx.fillStyle = 'rgb(9, 162, 170)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // mid-line
  ctx.strokeStyle = 'grey';
  ctx.beginPath();
  ctx.moveTo(0, HEIGHT / 2);
  ctx.lineTo(WIDTH, HEIGHT / 2);
  ctx.closePath();
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 0, 0, 0.25)";
  ctx.strokeStyle = "red";

  let polygon = [{x:0, y:0}];
  for (let i = 0; i < normalized.length; i++) {
    if (normalized[i] === 0) {
      polygon.push({x: i + 1, y: 0});
      draw_polygon(ctx, polygon);
      polygon = [{x: i + 1, y: 0}];
    } else {
      if (polygon[polygon.length - 1].y * normalized[i] < 0) {
        let zero_x = get_zero(polygon[polygon.length - 1].y, normalized[i]);
        let zero = {x: i + zero_x, y: 0};
        polygon.push(zero);
        draw_polygon(ctx, polygon);
        polygon = [zero];
      }
      polygon.push({x: i + 1, y: normalized[i]});
    }
  }
  polygon.push({x: normalized.length, y: 0});
  draw_polygon(ctx, polygon);


  // line
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgb(199, 249, 252)";
  ctx.beginPath();
  ctx.moveTo(0, HEIGHT / 2);
  for (let i = 0; i < normalized.length; i++) {
    ctx.lineTo((i + 1) * WIDTH / 64, HEIGHT / 2 - normalized[i]);
  }
  ctx.stroke();


  return canvas;
}
