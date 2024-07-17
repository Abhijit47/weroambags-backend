const { writeFile, unlink } = require('fs/promises');
const { existsSync, mkdirSync } = require('fs');
const { join } = require('path');

const multer = require('multer');

const Bag = require('../models/bagsModel');
const { randomId } = require('../utils/helpers');

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

    if (req.files.length <= 0) {
      return res.status(400).json({ message: 'Please upload thumbnails' });
    }

    let id = randomId();

    const files = req.files.map(
      (file) =>
        file.originalname
          .toLowerCase()
          .replaceAll(' ', '-')
          .replace(/\s/g, '-')
          .split('.')[0] +
        '-' +
        id +
        '.' +
        file.originalname.split('.')[1]
    );

    // console.log('files', files);

    req.files.forEach(async (file) => {
      const fileName =
        file.originalname
          .toLowerCase()
          .replaceAll(' ', '-')
          .replace(/\s/g, '-')
          .split('.')[0] +
        '-' +
        id +
        '.' +
        file.originalname.split('.')[1];

      const folderName = join(__dirname, '..', 'public', 'bags');

      // check if the folder exists
      if (!existsSync(folderName)) {
        mkdirSync(folderName);
      }

      await writeFile(join(folderName, fileName), file.buffer);
    });

    const url = `https://weroambags-backend.onrender.com`;
    // access the images
    const images = files.map((file) => `${url}/bags/${file}`);

    // console.log('images', images);

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
    const newBag = await Bag.create(obj);

    // reset the id
    id = '';

    return res
      .status(201)
      .json({ message: 'Bag added to your collection', newBag });
  } catch (error) {
    console.log('error from create endpont', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.updateBag = async (req, res, next) => {
  try {
    const bagId = req.params.id;

    if (!bagId || bagId.length < 24) {
      return res.status(400).json({ message: 'Invalid bag ID' });
    }

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

    const existingBag = await Bag.findById({ _id: bagId }).lean();
    if (!existingBag) {
      return res.status(404).json({ message: 'Bag not found for update' });
    }

    let newImages = undefined;

    if (!req.files.length <= 0) {
      let id = randomId();
      const files = req.files.map(
        (file) =>
          file.originalname
            .toLowerCase()
            .replaceAll(' ', '-')
            .replace(/\s/g, '-')
            .split('.')[0] +
          '-' +
          id +
          '.' +
          file.originalname.split('.')[1]
      );

      const existingThumbnails = existingBag.thumbnail;

      // Remove the old images
      existingThumbnails.forEach(async (image) => {
        const imageName = image.split('/').pop();
        const folderName = join(process.cwd(), 'public', 'bags');

        await unlink(join(folderName, imageName));
      });

      // Upload the new images
      req.files.forEach(async (file) => {
        const fileName =
          file.originalname
            .toLowerCase()
            .replaceAll(' ', '-')
            .replace(/\s/g, '-')
            .split('.')[0] +
          '-' +
          id +
          '.' +
          file.originalname.split('.')[1];

        const folderName = join(__dirname, '..', 'public', 'bags');

        // check if the folder exists
        if (!existsSync(folderName)) {
          mkdirSync(folderName);
        }

        await writeFile(join(folderName, fileName), file.buffer);
      });
      const url = `https://weroambags-backend.onrender.com`;

      // access the images
      newImages = files.map((file) => `${url}/bags/${file}`);
    }

    const updatedReqObj = {
      title: title || existingBag.title,
      oldPrice: oldPrice || existingBag.oldPrice,
      rating: rating || existingBag.rating,
      newPrice: newPrice || existingBag.newPrice,
      available: available || existingBag.available,
      sold: sold || existingBag.sold,
      thumbnail: newImages ?? existingBag.thumbnail,
      category: existingBag.category,
      subCategory: existingBag.subCategory,
      quantity: quantity || existingBag.quantity,
      reviewsCount: reviewsCount || existingBag.reviewsCount,
      description: description || existingBag.description,
      specifications: specifications || existingBag.specifications,
    };

    const updatedBag = await Bag.findOneAndUpdate(
      {
        _id: bagId,
      },
      {
        $set: updatedReqObj,
      },
      {
        new: true,
        runValidators: true,
      }
    ).lean();

    if (!updatedBag) {
      return res.status(404).json({ message: 'Bag not found' });
    }

    // Reset the id
    id = '';

    // Return the image
    newImages = undefined;

    return res.status(200).json({ message: 'Update a bag', updatedBag });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.deleteBag = async (req, res, next) => {
  try {
    const bagId = req.params.id;

    if (!bagId || bagId.length < 24) {
      return res.status(400).json({ message: 'Invalid bag ID' });
    }

    const existingBag = await Bag.findById(bagId).lean();

    if (!existingBag) {
      return res.status(404).json({ message: 'Bag not found' });
    }

    const images = existingBag.thumbnail;

    // console.log('images', images);

    if (images.length >= 0) {
      images.forEach(async (image) => {
        const imageName = image.split('/').pop();
        const folderName = join(process.cwd(), 'public', 'bags');

        // console.log('', folderName, imageName);

        // images are existing
        if (existsSync(join(folderName, imageName))) {
          await unlink(join(folderName, imageName));
        }

        // await unlink(join(folderName, imageName));
      });
    }

    const deleteBag = await Bag.findByIdAndDelete(bagId)
      .lean()
      .select('-updatedAt');

    if (!deleteBag) {
      return res.status(404).json({ message: 'Bag not found for delete' });
    }

    return res
      .status(200)
      .json({ message: 'Successfully deleted bag', deletedBag: deleteBag._id });
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
