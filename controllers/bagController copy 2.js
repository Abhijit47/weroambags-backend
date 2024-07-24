const { writeFile, unlink } = require('fs/promises');
const { existsSync, mkdirSync } = require('fs');
const { join } = require('path');

const NodeCache = require('node-cache');
const multer = require('multer');

// const memoryUsage = process.memoryUsage();
// console.log('memoryUsage', memoryUsage);
const { categories, subCategories } = require('../models/enums');

const Bag = require('../models/bagModel');
const Category = require('../models/categoryModel');
const SubCategory = require('../models/subCategoryModel');

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
    if (q) {
      const filteredCategory = await Category.find(
        {
          $or: [{ name: q }],
        },
        { bags: 1, subCategories: 1 },
        { limit: limit, skip: skip }
      )
        .lean()
        .select('-updatedAt')
        .populate('bags', '-updatedAt -category -subCategory -createdAt')
        .populate('category', 'name')
        .populate('subCategories', 'name')
        .exec();

      // const filteredSubCategory = await SubCategory.find(
      //   {
      //     // name is an array
      //     name: { $elemMatch: { $eq: q } },
      //     // $or: [
      //     //   {
      //     //     name: {
      //     //       $elemMatch: { $eq: q },
      //     //     },
      //     //   },
      //     // ],
      //   },
      //   { bags: 1, category: 1 },
      //   { limit: limit, skip: skip }
      // )
      //   .lean()
      //   .select('-updatedAt')
      //   // .populate('bags', '-updatedAt -category -subCategory -createdAt')
      //   .populate('category', 'name')
      //   .populate('subCategory', 'name')
      //   .exec();

      // console.log('filteredSubCategory', filteredSubCategory);

      // const filteredBags = [...filteredCategory, ...filteredSubCategory];
      const filteredBags = [...filteredCategory];

      if (!filteredBags) {
        return errorResponse(res, 404, 'fail', 'No bags found');
      }

      return successResponse(res, 200, 'success', 'Successfully get bags', {
        totalBags,
        totalPages,
        nextPage,
        currentPage,
        prevPage,
        perPage: limit,
        bags: filteredBags,
      });
    }

    // if (categories.includes(q) || subCategories.includes(q)) {
    //   // check if the cache has the data
    //   const cacheKey = q;
    //   const cacheValue = bagCache.get(cacheKey);

    //   if (cacheValue) {
    //     return successResponse(res, 200, 'success', 'Successfully get bags', {
    //       totalBags,
    //       totalPages,
    //       nextPage,
    //       currentPage,
    //       prevPage,
    //       perPage: limit,
    //       bags: cacheValue,
    //     });
    //   } else {
    //     const categorisedBags = await Bag.find({ category: q })
    //       .lean()
    //       .select('-updatedAt')
    //       .populate('category', 'name')
    //       .populate('subCategory', 'name')
    //       .exec();

    //     // set the cache
    //     bagCache.set(cacheKey, categorisedBags, 3600);

    //     if (!categorisedBags) {
    //       return errorResponse(res, 404, 'fail', 'No bags found');
    //     }

    //     return successResponse(res, 200, 'success', 'Successfully get bags', {
    //       totalBags,
    //       totalPages,
    //       nextPage,
    //       currentPage,
    //       prevPage,
    //       perPage: limit,
    //       bags: categorisedBags,
    //     });
    //   }
    // }

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
          .select('-updatedAt')
          .populate('category', 'name')
          .populate('subCategory', 'name')
          .exec();

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
        .select('-updatedAt')
        .populate('category', 'name')
        .populate('subCategory', 'name')
        .exec();

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
      const bag = await Bag.findById(bagId)
        .lean()
        .select('-updatedAt')
        .populate('category', 'name')
        .populate('subCategory', 'name')
        .exec();

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

    // console.log('reqBody', req.body);

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
      // category,
      // subCategory,
      quantity,
      reviewsCount,
      description,
      specifications,
    };

    const [newBag, newCategory, newSubCategory] = await Promise.all([
      Bag.create(obj),
      Category.create({
        name: category,
      }),
      SubCategory.create({
        name: JSON.parse(subCategory),
      }),
    ]);

    if (!newBag || !newCategory || !newSubCategory) {
      return errorResponse(res, 400, 'fail', 'Bag not created');
    }

    // create a bag
    // const newBag = await Bag.create(obj);

    // create a category
    // const newCategory = await Category.create({
    //   name: category,
    // });

    // create a subcategory
    // const newSubCategory = await SubCategory.create({
    //   name: subCategory,
    // });

    // update the bag with the category and subcategory
    if (newBag && newCategory && newSubCategory) {
      // console.log('newBag', newBag._id);
      // console.log('newCategory', newCategory._id);
      // console.log('newSubCategory', newSubCategory._id);
      const [updatedBag] = await Promise.all([
        Bag.findOneAndUpdate(
          { _id: newBag._id },
          {
            $set: {
              category: newCategory._id,
              subCategory: newSubCategory._id,
            },
          },
          { new: true }
        ),
        Category.findOneAndUpdate(
          { _id: newCategory._id },
          {
            $set: { subCategories: newSubCategory._id },
            $push: { bags: newBag._id },
          },
          { new: true }
        ),
        SubCategory.findOneAndUpdate(
          { _id: newSubCategory._id },
          { $set: { category: newCategory._id }, $push: { bags: newBag._id } },
          { new: true }
        ),
      ]);

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
        updatedBag
      );
    }
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
      return errorResponse(res, 404, 'fail', 'Something went wrong!');
    }

    // update the bag with the category and subcategory
    // const [updatedCategory, updatedSubCategory] = await Promise.all([
    //   Category.findOneAndUpdate(
    //     { category: updatedBag.category },
    //     {
    //       $set: { name: category },
    //     },
    //     { new: true }
    //   ),
    //   SubCategory.findOneAndUpdate(
    //     { subCategory: updatedBag.subCategory },
    //     {
    //       $set: { name: JSON.parse(subCategory) },
    //     },
    //     { new: true }
    //   ),
    // ]);

    // if (!updatedCategory || !updatedSubCategory) {
    //   return errorResponse(
    //     res,
    //     404,
    //     'fail',
    //     'Category or SubCategory not found'
    //   );
    // }

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

    // const deleteBag = await Bag.findByIdAndDelete(bagId)
    //   .lean()
    //   .select('-updatedAt');

    // const deleteCategory = await Category.findOneAndDelete({
    //   _id: existingBag.category._id,
    // });

    // const deleteSubCategory = await SubCategory.findOneAndDelete({
    //   _id: existingBag.subCategory._id,
    // });

    const [deleteBag, deleteCategory, deleteSubCategory] = await Promise.all([
      Bag.findByIdAndDelete(bagId).lean().select('-updatedAt'),
      Category.findOneAndDelete({ _id: existingBag.category._id }),
      SubCategory.findOneAndDelete({ _id: existingBag.subCategory._id }),
    ]);

    if (!deleteBag || !deleteCategory || !deleteSubCategory) {
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

exports.getCategories = async (req, res, next) => {
  try {
    // check if the cache has the data
    const cacheKey = 'categories';
    const cacheValue = bagCache.get(cacheKey);

    if (cacheValue) {
      return successResponse(
        res,
        200,
        'success',
        'Successfully get categories',
        {
          categories: cacheValue,
        }
      );
    } else {
      const categories = await Category.find({})
        .lean()
        .populate('bags', '-updatedAt -category -subCategory -createdAt')
        .populate('subCategories', 'name')
        .select('-updatedAt')
        .exec();

      if (!categories) {
        return errorResponse(res, 404, 'fail', 'No categories found');
      }

      // set the cache
      bagCache.set(cacheKey, categories, 3600);

      return successResponse(
        res,
        200,
        'success',
        'Successfully get categories',
        {
          categories,
        }
      );
    }
  } catch (error) {
    console.error(error.name);
    console.error(error.message);
    console.error(error.stack);

    return errorResponse(res, 500, 'fail', error.message);
  }
};

exports.getSubCategories = async (req, res, next) => {
  try {
    // check if the cache has the data
    const cacheKey = 'subCategories';
    const cacheValue = bagCache.get(cacheKey);

    if (cacheValue) {
      return successResponse(
        res,
        200,
        'success',
        'Successfully get sub-categories',
        {
          subCategories: cacheValue,
        }
      );
    } else {
      const subCategories = await SubCategory.find()
        .lean()
        .select('-updatedAt')
        .populate('bags', '-updatedAt -category -subCategory -createdAt')
        .populate('category', 'name')
        .exec();

      if (!subCategories) {
        return errorResponse(res, 404, 'fail', 'No sub-categories found');
      }

      // set the cache
      bagCache.set(cacheKey, subCategories, 3600);

      return successResponse(
        res,
        200,
        'success',
        'Successfully get sub-categories',
        {
          subCategories,
        }
      );
    }
  } catch (error) {
    console.error(error.name);
    console.error(error.message);
    console.error(error.stack);

    return errorResponse(res, 500, 'fail', error.message);
  }
};

// exports.createCategory = async (req, res, next) => { };

// exports.createSubCategory = async (req, res, next) => { };

exports.updateCategory = async (req, res, next) => {
  try {
    const { categoryName, bagId, subCategories } = req.body;
    if (bagId <= 24) {
      return errorResponse(res, 400, 'fail', 'Invalid bag ID');
    }

    if (!categoryName || !bagId || !subCategories) {
      return errorResponse(res, 400, 'fail', 'Please provide all the details');
    }

    // console.log('sc', JSON.stringify(subCategories));

    // throw new Error('Testing');

    const existingBag = await Bag.findOne({ _id: bagId }).lean();
    if (!existingBag) {
      return errorResponse(res, 404, 'fail', 'Bag not found');
    }

    const updatedCategory = await Category.findOneAndUpdate(
      { _id: existingBag.category },
      { $set: { name: categoryName } },
      { new: true }
    ).lean();

    const updatedSubCategory = await SubCategory.findOneAndUpdate(
      {
        _id: existingBag.subCategory,
      },
      {
        name: JSON.parse(JSON.stringify(subCategories)),
      },
      { new: true }
    ).lean();

    // console.log('updatedCategory', updatedCategory);
    // console.log('updatedSubCategory', updatedSubCategory);
    if (!updatedCategory || !updatedSubCategory) {
      return errorResponse(res, 404, 'fail', 'Category not found');
    }

    // update the bag with the category and subcategory
    const updatedBag = await Bag.findOneAndUpdate(
      { _id: bagId },
      {
        $set: { category: updatedCategory._id },
        $set: { subCategory: updatedSubCategory._id },
      },
      { new: true }
    );

    if (!updatedBag) {
      return errorResponse(res, 404, 'fail', 'Category not found');
    }

    return successResponse(
      res,
      200,
      'success',
      'Successfully updated category'
      // updatedCategory._id
    );
  } catch (error) {
    console.error(error.name);
    console.error(error.message);
    console.error(error.stack);

    return errorResponse(res, 500, 'fail', error.message);
  }
};

exports.updateSubCategory = async (req, res, next) => {
  try {
    return successResponse(
      res,
      200,
      'success',
      'Successfully updated sub-category'
    );
  } catch (error) {
    console.error(error.name);
    console.error(error.message);
    console.error(error.stack);

    return errorResponse(res, 500, 'fail', error.message);
  }
};

async function deleteBags() {
  try {
    const deleteBags = await Bag.deleteMany();
    const deleteCategories = await Category.deleteMany();
    const deleteSubCategories = await SubCategory.deleteMany();
    console.log(
      'deleteBags',
      deleteBags,
      deleteCategories,
      deleteSubCategories
    );
  } catch (error) {
    console.error(error.name);
    console.error(error.message);
    console.error(error.stack);
  }
}

// deleteBags();
