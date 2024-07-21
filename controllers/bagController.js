const { writeFile, unlink } = require('fs/promises');
const { existsSync, mkdirSync } = require('fs');
const { join } = require('path');

const NodeCache = require('node-cache');
const multer = require('multer');

// const memoryUsage = process.memoryUsage();
// console.log('memoryUsage', memoryUsage);
const { categories, subCategories } = require('../models/enums');

const Bag = require('../models/bagsModel');
const {
  randomId,
  successResponse,
  errorResponse,
} = require('../utils/helpers');

// Initialize the cache
const bagCache = new NodeCache({ stdTTL: 60 * 60 });

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
  // check all the keys in the cache
  const mykeys = bagCache.keys();

  // console.log(mykeys);
  try {
    const { q, search } = req.query;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const totalBags = await Bag.countDocuments();
    const totalPages = Math.ceil(totalBags / limit);
    const nextPage = page < totalPages ? Number(page) + 1 : null;
    const prevPage = page > 1 ? page - 1 : null;
    const currentPage = page;

    // check if the query is a category or subcategory
    // filter the bags
    if (categories.includes(q) || subCategories.includes(q)) {
      // check if the cache has the data
      const cacheKey = q;
      const cacheValue = bagCache.get(cacheKey);

      if (cacheValue) {
        return successResponse(res, 200, 'success', 'Successfully get bags', {
          totalBags,
          totalPages,
          nextPage,
          currentPage,
          prevPage,
          perPage: limit,
          bags: cacheValue,
        });
      } else {
        const categorisedBags = await Bag.find({ category: q })
          .lean()
          .select('-updatedAt');

        // set the cache
        bagCache.set(cacheKey, categorisedBags, 3600);

        if (!categorisedBags) {
          return errorResponse(res, 404, 'fail', 'No bags found');
        }

        return successResponse(res, 200, 'success', 'Successfully get bags', {
          totalBags,
          totalPages,
          nextPage,
          currentPage,
          prevPage,
          perPage: limit,
          bags: categorisedBags,
        });
      }
    }

    // check if the search query is available
    if (search) {
      // check if the cache has the data
      const cacheKey = search;
      const cacheValue = bagCache.get(cacheKey);

      if (cacheValue) {
        return successResponse(res, 200, 'success', 'Successfully get bags', {
          totalBags,
          totalPages,
          nextPage,
          currentPage,
          prevPage,
          perPage: limit,
          bags: cacheValue,
        });
      } else {
        const searchBags = await Bag.find({
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { category: { $regex: search, $options: 'i' } },
            { subCategory: { $regex: search, $options: 'i' } },
          ],
        })
          .lean()
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip)
          .select('-updatedAt');

        // set the cache
        bagCache.set(cacheKey, searchBags, 3600);

        if (!searchBags) {
          return errorResponse(res, 404, 'fail', 'No bags found');
        }

        return successResponse(res, 200, 'success', 'Successfully get bags', {
          totalBags,
          totalPages,
          nextPage,
          currentPage,
          prevPage,
          perPage: limit,
          bags: searchBags,
        });
      }
    }

    // pagination
    // if (page) {
    //   if (page < 1) {
    //     return res.status(400).json({ message: 'Invalid page number' });
    //   }

    //   const cacheKey = `page-${page}`;
    //   const cacheValue = bagCache.get(cacheKey);

    //   const limit = 10;
    //   const skip = (page - 1) * limit;
    //   const totalBags = await Bag.countDocuments();
    //   const totalPages = Math.ceil(totalBags / limit);
    //   const nextPage = page < totalPages ? Number(page) + 1 : null;
    //   const prevPage = page > 1 ? page - 1 : null;
    //   const currentPage = Number(page);

    //   if (cacheValue) {
    //     return successResponse(res, 200, 'success', 'Successfully get bags', {
    //       totalBags,
    //       totalPages,
    //       nextPage,
    //       currentPage,
    //       prevPage,
    //       bags: cacheValue,
    //     });
    //   } else {
    //     const bags = await Bag.find({})
    //       .lean()
    //       .select('-updatedAt')
    //       .limit(limit)
    //       .skip(skip);

    //     if (!bags) {
    //       return errorResponse(res, 404, 'fail', 'No bags found');
    //     }

    //     // set the cache
    //     bagCache.set(cacheKey, bags, 3600);

    //     return successResponse(res, 200, 'success', 'Successfully get bags', {
    //       totalBags,
    //       totalPages,
    //       nextPage,
    //       currentPage,
    //       prevPage,
    //       bags,
    //     });
    //   }
    // }

    // check if the cache has the data
    const cacheValue = bagCache.get('allBags');

    if (cacheValue) {
      return successResponse(res, 200, 'success', 'Successfully get bags', {
        totalBags,
        totalPages,
        nextPage,
        currentPage,
        prevPage,
        perPage: limit,
        bags: cacheValue,
      });
    } else {
      const bags = await Bag.find({})
        .lean()
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .select('-updatedAt');

      if (!bags) {
        return errorResponse(res, 404, 'fail', 'No bags found');
      }

      // set the cache
      bagCache.set('allBags', bags, 3600);

      return successResponse(res, 200, 'success', 'Successfully get bags', {
        totalBags,
        totalPages,
        nextPage,
        currentPage,
        prevPage,
        perPage: limit,
        bags,
      });
    }
  } catch (error) {
    console.error(error.name);
    console.error(error.message);
    console.error(error.stack);

    return errorResponse(res, 500, 'fail', error.message);
  }
};

exports.getBag = async (req, res, next) => {
  try {
    const bagId = req.params.id;
    if (!bagId || bagId.length < 24) {
      return errorResponse(res, 400, 'fail', 'Invalid bag ID');
    }

    const cacheKey = bagId;
    const cachedValue = bagCache.get(cacheKey);

    if (cachedValue) {
      return successResponse(res, 200, 'success', 'Successfully get bag', {
        bag: cachedValue,
      });
    } else {
      const bag = await Bag.findById(bagId).lean().select('-updatedAt');

      if (!bag) {
        return errorResponse(res, 404, 'fail', 'Bag not found');
      }

      // set the cache
      bagCache.set(cacheKey, bag, 3600);

      return successResponse(res, 200, 'success', 'Successfully get bag', bag);
    }
  } catch (error) {
    console.error(error.name);
    console.error(error.message);
    console.error(error.stack);

    return errorResponse(res, 500, 'fail', error.message);
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
      return errorResponse(res, 400, 'fail', 'Please provide all the details');
    }

    if (req.files.length <= 0) {
      return errorResponse(res, 400, 'fail', 'Please upload thumbnails');
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

    // check if the cache has the data
    const cacheKeys = bagCache.keys();

    if (cacheKeys.length > 0) {
      bagCache.flushAll();
      bagCache.flushStats();
    }

    return successResponse(
      res,
      201,
      'success',
      'Bag added to your collection',
      newBag
    );
  } catch (error) {
    console.error(error.name);
    console.error(error.message);
    console.error(error.stack);

    return errorResponse(res, 500, 'fail', error.message);
  }
};

exports.updateBag = async (req, res, next) => {
  try {
    const bagId = req.params.id;

    if (!bagId || bagId.length < 24) {
      return errorResponse(res, 400, 'fail', 'Invalid bag ID');
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
      return errorResponse(res, 404, 'fail', 'Bag not found for update');
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
      return errorResponse(res, 404, 'fail', 'Bag not found');
    }

    // Reset the id
    id = '';

    // Return the image
    newImages = undefined;

    // check if the cache has the data
    const cacheKey = bagId;
    const cacheValue = bagCache.get(cacheKey);

    if (cacheValue) {
      bagCache.del(cacheKey);
    }

    return successResponse(
      res,
      200,
      'success',
      'Successfully updated bag',
      updatedBag
    );
  } catch (error) {
    console.error(error.name);
    console.error(error.message);
    console.error(error.stack);

    return errorResponse(res, 500, 'fail', error.message);
  }
};

exports.deleteBag = async (req, res, next) => {
  try {
    const bagId = req.params.id;
    if (!bagId || bagId.length < 24) {
      return errorResponse(res, 400, 'fail', 'Invalid bag ID');
    }

    const existingBag = await Bag.findById(bagId).lean();

    if (!existingBag) {
      return errorResponse(res, 404, 'fail', 'Bag not found');
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
      return errorResponse(res, 404, 'fail', 'Bag not found for delete');
    }

    // check if the cache has the data
    const cacheKey = bagId;
    const cacheValue = bagCache.get(cacheKey);

    if (cacheValue) {
      bagCache.del(cacheKey);
    }

    return successResponse(
      res,
      200,
      'success',
      'Successfully deleted bag',
      deleteBag._id
    );
  } catch (error) {
    console.error(error.name);
    console.error(error.message);
    console.error(error.stack);

    return errorResponse(res, 500, 'fail', error.message);
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
