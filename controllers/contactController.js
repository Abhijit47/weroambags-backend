const NodeCache = require('node-cache');

const ContactUs = require('../models/contactUsModel');
const { errorResponse, successResponse } = require('../utils/helpers');

const contactCache = new NodeCache({ stdTTL: 60 * 60 });

exports.createContact = async (req, res, next) => {
  try {
    const { firstName, lastName, email, phoneNo, message } = req.body;

    if (!firstName || !lastName || !email || !phoneNo || !message) {
      return errorResponse(res, 400, 'Bad Request', 'All fields are required');
    }

    // Check if email already exists
    const existingContact = await ContactUs.find({ email });
    if (existingContact) {
      return errorResponse(
        res,
        409,
        'fail',
        'email already exists',
        existingContact.email
      );
    }

    const newContact = await ContactUs.create({
      firstName,
      lastName,
      email,
      phoneNo,
      message,
    });

    if (!newContact) {
      return errorResponse(
        res,
        500,
        'Something went wrong',
        'An error occurred while creating contact'
      );
    }

    // check if the contact is already in the cache
    const cacheKeys = contactCache.keys();
    if (cacheKeys) {
      contactCache.flushAll();
      contactCache.flushStats();
    }

    return successResponse(
      res,
      201,
      'success',
      'Contact created successfully',
      newContact._id
    );
  } catch (error) {
    console.error(error.name);
    console.error(error.message);
    console.error(error.stack);
    return errorResponse(res, 500, 'Server Error', error.message);
  }
};

exports.getContacts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const totalContacts = await ContactUs.countDocuments();
    const totalPages = Math.ceil(totalContacts / limit);
    const nextPage = page < totalPages ? page + 1 : null;
    const prevPage = page > 1 ? page - 1 : null;
    const currentPage = page;
    const offset = (page - 1) * limit;

    // check if the contact is already in the cache
    const cacheValue = contactCache.get('contacts');
    if (cacheValue) {
      return successResponse(
        res,
        200,
        'success',
        'Contacts retrieved successfully',
        {
          totalContacts,
          totalPages,
          nextPage,
          prevPage,
          currentPage,
          perPage: limit,
          contacts: cacheValue,
        }
      );
    } else {
      const contacts = await ContactUs.find({})
        .lean()
        .skip(offset)
        .limit(limit)
        .sort({ createdAt: -1 })
        .select('-updatedAt')
        .exec();

      if (!contacts) {
        return errorResponse(res, 404, 'Not Found', 'No contacts found');
      }

      // set the contacts in the cache
      contactCache.set('contacts', contacts);

      return successResponse(
        res,
        200,
        'success',
        'Contacts retrieved successfully',
        {
          totalContacts,
          totalPages,
          nextPage,
          prevPage,
          currentPage,
          perPage: limit,
          contacts,
        }
      );
    }
  } catch (error) {
    console.error(error.name);
    console.error(error.message);
    console.error(error.stack);
    return errorResponse(res, 500, 'Internal Server Error', error.message);
  }
};

exports.getContact = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || id <= 24) {
      return errorResponse(
        res,
        400,
        'Bad Request',
        'Contact ID is required',
        id
      );
    }

    const contact = await ContactUs.findById({ _id: id })
      .lean()
      .select('-updatedAt');

    return successResponse(
      res,
      200,
      'success',
      'Contact retrieved successfully',
      contact
    );
  } catch (error) {
    console.error(error.name);
    console.error(error.message);
    console.error(error.stack);
    return errorResponse(res, 500, 'Internal Server Error', error.message);
  }
};

exports.updateContact = async (req, res, next) => {
  try {
    return successResponse(res, 200, 'success', 'Contact updated successfully');
  } catch (error) {
    console.error(error.name);
    console.error(error.message);
    console.error(error.stack);
    return errorResponse(res, 500, 'Internal Server Error', error.message);
  }
};

exports.deleteContact = async (req, res, next) => {
  try {
    return successResponse(res, 200, 'success', 'Contact deleted successfully');
  } catch (error) {
    console.error(error.name);
    console.error(error.message);
    console.error(error.stack);
    return errorResponse(res, 500, 'Internal Server Error', error.message);
  }
};
