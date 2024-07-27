const { writeFile, unlink } = require('fs/promises');
const { existsSync, mkdirSync, readFileSync } = require('fs');
const { join } = require('path');

const NodeCache = require('node-cache');
// const memoryUsage = process.memoryUsage();
// console.log('memoryUsage', memoryUsage);
// const { categories, subCategories, allowedKeys } = require('../models/enums');

const Bag = require('../models/bagModel');
const Category = require('../models/categoryModel');
const SubCategory = require('../models/subCategoryModel');
const uploader = require('../configs/cloudinary');
const upload = require('../configs/multerConfig');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const {
  randomId,
  successResponse,
  filteredBody,
  checkBodyRequest,
  purgeCache,
} = require('../utils/helpers');

// Initialize the cache
const bagCache = new NodeCache({ stdTTL: 60 * 60 });

exports.uploadBagsImage = upload.array('thumbnail', 3);

function uploadMultipleImagesToServer(files, directoryName) {
  // Generate a random id
  let id = randomId();

  // Generate the file names
  const fileNames = files.map(
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

  // Each file is uploaded to the public folder in the server specified directory
  files.forEach(async (file) => {
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

    const folderName = join(__dirname, '..', 'public', directoryName);

    // check if the folder exists
    if (!existsSync(folderName)) {
      mkdirSync(folderName);
    }

    // Store it in the public folder in the server
    await writeFile(join(folderName, fileName), file.buffer);
  });

  // reset the id
  id = '';

  // return the file names
  return fileNames;
}

exports.uploadToServer = catchAsync(async (req, res, next) => {
  if (req.files.length <= 0) {
    return next(new AppError('Please upload thumbnails', 400));
  }

  // console.log(req.files[0]);

  // const files = uploadMultipleImagesToServer(req.files, 'bags');

  // Generate a random id
  let id = randomId();

  // Generate the file names
  const fileNames = req.files.map(
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

  // Each file is uploaded to the public folder in the server specified directory
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

  // reset the id
  id = '';

  // set the files in the request object
  req.filesNames = fileNames;

  next();
});

exports.uploadToCloud = catchAsync(async (req, res, next) => {
  // console.log('filePaths', req.filesNames);

  // Cloudinary folder name
  const cloudinaryFolder = 'bags';

  let filePath2 = undefined;
  let filePath3 = undefined;
  let file2 = undefined;
  let file3 = undefined;

  const folderName = join(__dirname, '..', 'public', 'bags');

  // get the file paths 1
  const filePath1 = join(folderName, req.filesNames[0]);
  // get the file paths 2
  if (req.filesNames.length > 1) {
    filePath2 = join(folderName, req.filesNames[1]);
  }
  // get the file paths 3
  if (req.filesNames.length > 2) {
    filePath3 = join(folderName, req.filesNames[2]);
  }

  // console.log('filePaths1', filePath1);
  // console.log('filePaths2', filePath2); // undefined
  // console.log('filePaths3', filePath3); // undefined

  // Upload the images to cloudinary
  const file1 = await uploader.upload(filePath1, {
    // upload_preset: 'images',
    folder: cloudinaryFolder,
    use_filename: true,
    unique_filename: false,
    overwrite: true,
    invalidate: true,
    // async: true,
  });

  unlink(filePath1, (err) => {
    if (err) {
      console.error(err);
    } else {
      console.log('file1 deleted'); // logged on server console
    }
  });

  if (filePath2) {
    file2 = await uploader.upload(filePath2, {
      // upload_preset: 'images',
      folder: cloudinaryFolder,
      use_filename: true,
      unique_filename: false,
      overwrite: true,
      invalidate: true,
      // async: true,
    });

    unlink(filePath2, (err) => {
      if (err) {
        console.error(err);
      } else {
        console.log('file2 deleted'); // logged on server console
      }
    });
  }

  if (filePath3) {
    file3 = await uploader.upload(filePath3, {
      // upload_preset: 'images',
      folder: cloudinaryFolder,
      use_filename: true,
      unique_filename: false,
      overwrite: true,
      invalidate: true,
      // async: true,
    });

    unlink(filePath3, (err) => {
      if (err) {
        console.error(err);
      } else {
        console.log('file3 deleted'); // logged on server console
      }
    });
  }

  // console.log('file1', file1);
  // console.log('file2', file2);
  // console.log('file3', file3);

  const cloudinaryResponses = [file1, file2, file3];

  // set the secure url in the request object
  req.cloudinaryResponses = cloudinaryResponses;

  // reset the inner variables
  filePath2 = undefined;
  filePath3 = undefined;
  file2 = undefined;
  file3 = undefined;

  // return to the next middleware
  next();
});

exports.getBags = catchAsync(async (req, res, next) => {
  // check all the keys in the cache
  const mykeys = bagCache.keys();

  // console.log(mykeys);

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
    const filteredCategory = await Category.find({
      name: { $regex: q, $options: 'i' },
    })
      .lean()
      .select('-updatedAt -createdAt')
      .populate(
        'bags',
        '-updatedAt -assetId1 -assetId2 -assetId3 -publicId1 -publicId2 -publicId3 -secureUrl1 -secureUrl2 -secureUrl3 -category -subCategory -createdAt'
      )
      .populate('subCategories', 'name')
      .exec();

    const filteredBags = [...filteredCategory];

    if (filteredBags.length <= 0) {
      return next(new AppError('No bags found', 404));
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
          // { category: { $regex: search, $options: 'i' } },
          // { subCategory: { $regex: search, $options: 'i' } },
        ],
      })
        .lean()
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .select(
          '-updatedAt -assetId1 -assetId2 -assetId3 -publicId1 -publicId2 -publicId3 -secureUrl1 -secureUrl2 -secureUrl3'
        )
        .populate('category', 'name')
        .populate('subCategory', 'name')
        .exec();

      // set the cache
      bagCache.set(cacheKey, searchBags, 3600);

      if (searchBags.length <= 0) {
        return next(new AppError('No bags found', 404));
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
      .select(
        '-updatedAt -assetId1 -assetId2 -assetId3 -publicId1 -publicId2 -publicId3 -secureUrl1 -secureUrl2 -secureUrl3'
      )
      .populate('category', 'name')
      .populate('subCategory', 'name')
      .exec();

    if (!bags) {
      return next(new AppError('No bags found', 404));
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
});

exports.getBag = catchAsync(async (req, res, next) => {
  const bagId = req.params.id;
  if (!bagId || bagId.length !== 24) {
    return next(new AppError('Invalid bag ID', 400));
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
      .select(
        '-updatedAt -assetId1 -assetId2 -assetId3 -publicId1 -publicId2 -publicId3 -secureUrl1 -secureUrl2 -secureUrl3'
      )
      .populate('category', 'name')
      .populate('subCategory', 'name')
      .exec();

    if (!bag) {
      return next(new AppError('Bag not found', 404));
    }

    // set the cache
    bagCache.set(cacheKey, bag, 3600);

    return successResponse(res, 200, 'success', 'Successfully get bag', bag);
  }
});

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

exports.createBag = catchAsync(async (req, res, next) => {
  // check if the body is empty or not
  if (!filteredBody(req.body)) {
    return next(new AppError('Please provide correct details', 400));
  }

  // allowed keys are available in the body request or not
  // check if any allowed keys are missing
  if (!checkBodyRequest(req.body)) {
    return next(new AppError('Please provide all required fields', 400));
  }

  let images = [];

  // console.log('clouddinaryRes', req.cloudinaryResponses);

  // const images = [req.secureUrl1, req.secureUrl2, req.secureUrl3];

  images.push(req.cloudinaryResponses[0].secure_url);

  if (req.cloudinaryResponses[1]) {
    images.push(req.cloudinaryResponses[1].secure_url);
  }

  if (req.cloudinaryResponses[2]) {
    images.push(req.cloudinaryResponses[2].secure_url);
  }

  const obj = {
    title: req.body.title,
    oldPrice: req.body.oldPrice,
    rating: req.body.rating,
    newPrice: req.body.newPrice,
    available: req.body.available,
    sold: req.body.sold,
    thumbnail: [...images],
    // category,
    // subCategory,
    quantity: req.body.quantity,
    reviewsCount: req.body.reviewsCount,
    description: req.body.description,
    specifications: req.body.specifications,
    assetId1: req.cloudinaryResponses[0].asset_id,
    publicId1: req.cloudinaryResponses[0].public_id,
    secureUrl1: req.cloudinaryResponses[0].secure_url,
    assetId2: req.cloudinaryResponses[1]
      ? req.cloudinaryResponses[1].asset_id
      : '',
    publicId2: req.cloudinaryResponses[1]
      ? req.cloudinaryResponses[1].public_id
      : '',
    secureUrl2: req.cloudinaryResponses[1]
      ? req.cloudinaryResponses[1].secure_url
      : '',
    assetId3: req.cloudinaryResponses[2]
      ? req.cloudinaryResponses[2].asset_id
      : '',
    publicId3: req.cloudinaryResponses[2]
      ? req.cloudinaryResponses[2].public_id
      : '',
    secureUrl3: req.cloudinaryResponses[2]
      ? req.cloudinaryResponses[2].secure_url
      : '',
  };

  // console.log('reqobj', obj);

  const [newBag, newCategory, newSubCategory] = await Promise.all([
    Bag.create(obj),
    Category.create({
      name: req.body.category,
    }),
    SubCategory.create({
      name: JSON.parse(req.body.subCategory),
    }),
  ]);

  if (!newBag || !newCategory || !newSubCategory) {
    return next(new AppError('Bag not created', 400));
  }

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

    // check if the cache has the data
    purgeCache(bagCache);

    // const cacheKeys = bagCache.keys();
    // if (cacheKeys.length > 0) {
    //   bagCache.flushAll();
    //   bagCache.flushStats();
    // }

    //reset the images
    images = [];

    return successResponse(
      res,
      201,
      'success',
      'Bag added to your collection',
      updatedBag
    );
  }
});

exports.updateBag = catchAsync(async (req, res, next) => {
  const bagId = req.params.id;
  if (!bagId || bagId.length !== 24) {
    return next(new AppError('Invalid bag ID', 400));
  }

  // check if the body is empty or not
  if (!filteredBody(req.body)) {
    return next(new AppError('Please provide correct details', 400));
  }

  const existingBag = await Bag.findById({ _id: bagId }).lean();
  if (!existingBag) {
    return next(new AppError('Bag not found for update', 404));
  }

  // delete the old images from cloudinary
  // sometime in the future publicId2 or publicId3 will be "" so we need to check for that
  let images = [];
  let filePath2 = undefined;
  let filePath3 = undefined;
  let file1 = undefined;
  let file2 = undefined;
  let file3 = undefined;

  // console.log('req.files', req.files.length);
  if (req.files.length > 0) {
    const folderName = join(__dirname, '..', 'public', 'bags');

    const fileNames = uploadMultipleImagesToServer(req.files, 'bags');
    // console.log('fileNames', fileNames); //['file1', 'file2', 'file3']

    // get the file paths 1
    const filePath1 = join(folderName, fileNames[0]);
    // get the file paths 2
    if (fileNames.length > 1) {
      filePath2 = join(folderName, fileNames[1]);
    }
    // get the file paths 3
    if (fileNames.length > 2) {
      filePath3 = join(folderName, fileNames[2]);
    }

    // get the public ids
    const publicIds = [
      existingBag.publicId1,
      existingBag.publicId2,
      existingBag.publicId3,
    ];

    // delete the old images from cloudinary
    publicIds.forEach(async (publicId) => {
      try {
        if (publicId) {
          await uploader.destroy(publicId, (error, result) => {
            if (error) {
              console.error(error);
            } else {
              console.log('cloud asset', result);
            }
          });
        }
      } catch (err) {
        console.error(err);
      }
    });

    // upload the images to cloudinary
    file1 = await uploader.upload(filePath1, {
      folder: 'bags',
      use_filename: true,
      unique_filename: false,
      overwrite: true,
      invalidate: true,
    });

    unlink(filePath1, (err) => {
      if (err) {
        console.error(err);
      } else {
        console.log('file1 deleted'); // logged on server console
      }
    });

    if (fileNames.length > 1) {
      file2 = await uploader.upload(filePath2, {
        folder: 'bags',
        use_filename: true,
        unique_filename: false,
        overwrite: true,
        invalidate: true,
      });

      unlink(filePath2, (err) => {
        if (err) {
          console.error(err);
        } else {
          console.log('file1 deleted'); // logged on server console
        }
      });
    }

    if (fileNames.length > 2) {
      file3 = await uploader.upload(filePath3, {
        folder: 'bags',
        use_filename: true,
        unique_filename: false,
        overwrite: true,
        invalidate: true,
      });

      unlink(filePath3, (err) => {
        if (err) {
          console.error(err);
        } else {
          console.log('file1 deleted'); // logged on server console
        }
      });
    }

    images.push(file1.secure_url);
    images.push(file2.secure_url);
    images.push(file3.secure_url);
  }

  // console.log(images.length);
  // console.log('images', images);
  // console.log('file1', file1);
  // console.log('file2', file2);
  // console.log('file3', file3);

  const updatedReqObj = {
    title: req.body.title || existingBag.title,
    oldPrice: req.body.oldPrice || existingBag.oldPrice,
    rating: req.body.rating || existingBag.rating,
    newPrice: req.body.newPrice || existingBag.newPrice,
    available: req.body.available || existingBag.available,
    sold: req.body.sold || existingBag.sold,
    thumbnail: images.length > 0 ? images : existingBag.thumbnail,
    // category: req.body.existingBag.category,
    // subCategory: req.body.existingBag.subCategory,
    quantity: req.body.quantity || existingBag.quantity,
    reviewsCount: req.body.reviewsCount || existingBag.reviewsCount,
    description: req.body.description || existingBag.description,
    specifications: req.body.specifications || existingBag.specifications,

    //
    assetId1: images[0] ? file1.asset_id : existingBag.assetId1,
    publicId1: images[0] ? file1.public_id : existingBag.publicId1,
    secureUrl1: images[0] ? file1.secure_url : existingBag.secureUrl1,

    //
    assetId2: images[1] ? file2.asset_id : existingBag.assetId2,
    publicId2: images[1] ? file2.public_id : existingBag.publicId2,
    secureUrl2: images[1] ? file2.secure_url : existingBag.secureUrl2,

    //
    assetId3: images[2] ? file3.asset_id : existingBag.assetId3,
    publicId3: images[2] ? file3.public_id : existingBag.publicId3,
    secureUrl3: images[2] ? file3.secure_url : existingBag.secureUrl3,
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
    return next(new AppError('Bag not found for update', 404));
  }

  // update the bag with the category and subcategory
  // const [updatedCategory, updatedSubCategory] = await Promise.all([
  //   Category.findOneAndUpdate(
  //     { _id: existingBag.category._id },
  //     {
  //       $set: { name: req.body?.category ?? existingBag.category },
  //     },
  //     { new: true }
  //   ),
  //   SubCategory.findOneAndUpdate(
  //     { _id: existingBag.subCategory._id },
  //     {
  //       $set: {
  //         name:
  //           req.body?.subCategoryJSON.parse(req.body?.subCategory) ??
  //           existingBag.subCategory,
  //       },
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

  // Reset the images
  images = [];
  filePath2 = undefined;
  filePath3 = undefined;
  file1 = undefined;
  file2 = undefined;
  file3 = undefined;

  // check if the cache has the data
  purgeCache(bagCache);

  return successResponse(
    res,
    200,
    'success',
    'Successfully updated bag',
    updatedBag
  );
});

exports.deleteBag = catchAsync(async (req, res, next) => {
  const bagId = req.params.id;
  if (!bagId || bagId.length !== 24) {
    return next(new AppError('Invalid bag ID', 400));
  }

  const existingBag = await Bag.findById(bagId).lean();

  if (!existingBag) {
    return next(new AppError('Bag not found for delete', 404));
  }

  // delete the images from cloudinary
  const publicIds = [
    existingBag.publicId1,
    existingBag.publicId2,
    existingBag.publicId3,
  ];

  publicIds.forEach(async (publicId) => {
    try {
      if (publicId) {
        await uploader.destroy(publicId, (error, result) => {
          if (error) {
            console.error(error);
          } else {
            console.log('cloud asset', result);
          }
        });
      }
    } catch (err) {
      console.error(err);
    }
  });

  // const images = existingBag.thumbnail;

  // console.log('images', images);

  // if (images.length >= 0) {
  //   images.forEach(async (image) => {
  //     const imageName = image.split('/').pop();
  //     const folderName = join(process.cwd(), 'public', 'bags');

  //     // console.log('', folderName, imageName);

  //     // images are existing
  //     if (existsSync(join(folderName, imageName))) {
  //       await unlink(join(folderName, imageName));
  //     }

  //     // await unlink(join(folderName, imageName));
  //   });
  // }

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
    return next(new AppError('Bag not found for delete', 404));
  }

  // check if the cache has the data
  purgeCache(bagCache);

  return successResponse(
    res,
    200,
    'success',
    'Successfully deleted bag',
    deleteBag._id
  );
});

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

exports.getCategories = catchAsync(async (req, res, next) => {
  // check if the cache has the data
  const cacheKey = 'categories';
  const cacheValue = bagCache.get(cacheKey);

  if (cacheValue) {
    return successResponse(res, 200, 'success', 'Successfully get categories', {
      categories: cacheValue,
    });
  } else {
    const categories = await Category.find({})
      .lean()
      .populate(
        'bags',
        '-updatedAt -assetId1 -assetId2 -assetId3 -publicId1 -publicId2 -publicId3 -secureUrl1 -secureUrl2 -secureUrl3'
      )
      .populate('subCategories', 'name')
      .select('-updatedAt -createdAt')
      .exec();

    if (!categories) {
      return next(new AppError('No categories found', 404));
    }

    // set the cache
    bagCache.set(cacheKey, categories, 3600);

    return successResponse(res, 200, 'success', 'Successfully get categories', {
      categories,
    });
  }
});

exports.getSubCategories = catchAsync(async (req, res, next) => {
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
      .select('-updatedAt -createdAt')
      .populate(
        'bags',
        '-updatedAt -assetId1 -assetId2 -assetId3 -publicId1 -publicId2 -publicId3 -secureUrl1 -secureUrl2 -secureUrl3'
      )
      .populate('category', 'name')
      .exec();

    if (!subCategories) {
      return next(new AppError('No sub-categories found', 404));
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
});

// exports.createCategory = async (req, res, next) => { };

// exports.createSubCategory = async (req, res, next) => { };

exports.updateCategory = catchAsync(async (req, res, next) => {
  const { categoryName, bagId, subCategories } = req.body;
  if (bagId.length !== 24) {
    return next(new AppError('Invalid bag ID', 400));
  }

  if (!categoryName || !bagId || !subCategories) {
    return next(new AppError('Please provide all the details', 400));
  }

  // console.log('sc', JSON.stringify(subCategories));

  // throw new Error('Testing');

  const existingBag = await Bag.findOne({ _id: bagId }).lean();
  if (!existingBag) {
    return next(new AppError('Bag not found', 404));
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
    return next(new AppError('Category or SubCategory not found', 404));
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
    return next(new AppError('Bag not found for update', 404));
  }

  return successResponse(
    res,
    200,
    'success',
    'Successfully updated category'
    // updatedCategory._id
  );
});

exports.updateSubCategory = catchAsync(async (req, res, next) => {
  return successResponse(
    res,
    200,
    'success',
    'Successfully updated sub-category'
  );
});

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
