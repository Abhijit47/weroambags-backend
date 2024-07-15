const { writeFile } = require('fs/promises');
const { existsSync, mkdirSync } = require('fs');
const { join } = require('path');
const multer = require('multer');
const Bag = require('../models/bagsModel');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadBagsImage = upload.array('thumbnail', 3);

exports.getBags = async (req, res, next) => {
  try {
    const bags = await Bag.find({}).lean().select('-updatedAt');

    if (!bags) {
      return res.status(404).json({ message: 'No bags found' });
    }

    // console.log('', await req.hostname);
    console.log('protocol', req.protocol);
    console.log('hostname', req.get('host'));
    console.log('originalUrl', req.originalUrl);
    console.log('baseUrl', req.baseUrl);
    console.log('path', req.path);

    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

    return res.status(200).json({ status: 'success', bags });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.getBag = async (req, res, next) => {
  try {
    const bagId = req.params.id;

    if (!bagId || bagId.length < 24) {
      return res.status(400).json({ message: 'Invalid bag ID' });
    }

    const bag = await Bag.findById(bagId).lean().select('-updatedAt');

    if (!bag) {
      return res.status(404).json({ message: 'Bag not found' });
    }

    return res.status(200).json({ status: 'success', bag });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.getAccessBagsImages = async (req, res, next) => {
  try {
    console.log('protocol', req.protocol);
    console.log('hostname', req.get('host'));
    console.log('originalUrl', req.originalUrl);
    console.log('baseUrl', req.baseUrl);
    console.log('path', req.path);
    console.log('query', req.query);
    console.log('params', req.params);
    console.log('', await req);

    // return res.send(Buffer.from('Hello World!'));
    return res.status(200).json({ message: 'Access public route' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.createBag = async (req, res, next) => {
  try {
    const {
      title,
      oldPrice,
      rating,
      newPrice,
      available,
      sold,
      category,
      subCategory,
      quantity,
      reviewsCount,
      description,
      specifications,
    } = req.body;

    if (
      !title ||
      !oldPrice ||
      !rating ||
      !newPrice ||
      !available ||
      !sold ||
      !category ||
      !subCategory ||
      !quantity ||
      !reviewsCount ||
      !description ||
      !specifications
    ) {
      return res
        .status(400)
        .json({ message: 'Please provide all the details' });
    }

    if (req.files.length < 0) {
      return res.status(400).json({ message: 'Please upload an image' });
    }

    const files = req.files.map(
      (file) =>
        file.originalname.split('.')[0] +
        '-' +
        Date.now() +
        '.' +
        file.originalname.split('.')[1]
    );

    req.files.forEach(async (file) => {
      const fileName = `${file.originalname.split('.')[0]}-${Date.now()}.${
        file.originalname.split('.')[1]
      }`;

      const folderName = join(__dirname, '..', 'public', 'bags');

      // check if the folder exists
      if (!existsSync(folderName)) {
        mkdirSync(folderName);
      }

      await writeFile(join(folderName, fileName), file.buffer);
    });
    const url = `${req.protocol}://${req.get('host')}/api/v1/public`;
    // access the images
    const images = files.map((file) => `${url}/bags/${file}`);

    const obj = {
      title,
      oldPrice,
      rating,
      newPrice,
      available,
      sold,
      thumbnail: images,
      category,
      subCategory,
      quantity,
      reviewsCount,
      description,
      specifications,
    };

    // create a bag
    const bag = await Bag.create(obj);

    return res
      .status(201)
      .json({ message: 'Bag added to your collection', bag });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.updateBag = async (req, res, next) => {
  try {
    return res.status(200).json({ message: 'Update a bag' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.deleteBag = async (req, res, next) => {
  try {
    return res.status(200).json({ message: 'Delete a bag' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.downloadImages = async (req, res, next) => {
  try {
    // extract the urls from the body
    const { urls } = req.body;

    // loop through the urls
    urls.forEach(async (url) => {
      // extract the image name from the url
      const imageName = url.split('/').pop();

      const fileName = `${imageName.split('.')[0]}.${imageName.split('.')[1]}`;
      const folderName = join(__dirname, '..', 'public', 'bags');

      // check if the folder exists
      if (!existsSync(folderName)) {
        mkdirSync(folderName);
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
      const buffer = Buffer.from(await res.arrayBuffer());

      await writeFile(join(folderName, fileName), buffer);
    });

    return res.status(200).json({ message: 'Download images' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
