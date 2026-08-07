const sharp = require("sharp");

const jobs = [
  ["companion", "/tmp/hf-recovery/214ec011-0608-4f49-9255-823ac22ee70d-source.webp"],
  ["station", "/tmp/hf-recovery/545f7d0b-836d-451b-8621-79ead5b587e4-source.png"],
  ["studio", "/tmp/hf-recovery/982d305f-42a4-4643-a411-2e77a36263da-source.png"],
  ["fuel", "/tmp/hf-recovery/e23da1b1-67fa-4943-8619-e8ba8aa962e3-source.png"],
  ["mrkt", "/tmp/hf-recovery/caad16e1-a493-4aa8-a3e0-8e570f67b534-source.png"],
];

async function buildMask(name, source) {
  const { data, info } = await sharp(source)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const mask = Buffer.alloc(info.width * info.height);
  let selected = 0;

  for (let p = 0, i = 0; p < data.length; p += 3, i += 1) {
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    const coolBlue = b > 82 && b - g > 34 && b > r * 0.88;
    const violet = b > 78 && r > 52 && b - g > 28 && r - g > 16;
    const luminous = Math.max(r, g, b) > 96;
    const value = luminous && (coolBlue || violet) ? 255 : 0;
    mask[i] = value;
    selected += value > 0 ? 1 : 0;
  }

  const output = `/tmp/hf-recovery/${name}-light-mask.png`;
  const maskImage = sharp(mask, {
    raw: { width: info.width, height: info.height, channels: 1 },
  });
  const outer = await maskImage.clone().dilate(5).raw().toBuffer({ resolveWithObject: true });
  const inner = await maskImage.clone().erode(5).raw().toBuffer({ resolveWithObject: true });
  const ring = Buffer.alloc(mask.length);
  for (let i = 0; i < ring.length; i += 1) {
    ring[i] = Math.abs(outer.data[i * outer.info.channels] - inner.data[i * inner.info.channels]);
  }

  await sharp(ring, {
    raw: { width: info.width, height: info.height, channels: 1 },
  })
    .blur(2.2)
    .png()
    .toFile(output);

  const coverage = ((selected / mask.length) * 100).toFixed(2);
  console.log(`${name}: ${coverage}% source coverage -> ${output}`);
}

Promise.all(jobs.map(([name, source]) => buildMask(name, source))).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
