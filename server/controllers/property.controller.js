import * as dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

import mongoose from 'mongoose';
import Property from '../mongodb/models/property.js';
import User from '../mongodb/models/user.js';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


const getAllProperties = async (req, res) => {

  const {
    _end, _order, _start, _sort, title_like = '', propertyType = '',
  } = req.query;

  const query = {};

  if (propertyType !== '') {
    query.propertyType = propertyType;
  }

  if (title_like) {
    query.title = { $regex: title_like, $options: 'i' };
  }

  try {
    const count = await Property.countDocuments({ query });
    const properties = await Property.find(query).limit(_end).skip(_start).sort({ [_sort]: _order });

    res.header('x-total-count', count);
    res.header('Access-Control-Expose-Headers','x-total-count');
    res.status(200).json(properties);
  } catch (error) {
    res.status(500).json(error.message);

  }
};

const getPropertyDetail = async (req, res) => {

  try {
    const { id } = req.params;
    const propertyExists = await Property.findOne({ _id: id }).populate('creator');

    if (propertyExists) res.status(200).json(propertyExists);
    else res.status(404).json({ message: 'Property does not exist' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to get the property details, please try again later' });
  }

};

const createProperty = async (req, res) => {
  try {
    const {
      title, description, propertyType, location, price, photo, email,
    } = req.body;

    // Start a new session
    const session = await mongoose.startSession();
    session.startTransaction();

    // Retrieve user by email
    const user = await User.findOne({ email }).session(session);
    if (!user) {
      throw new Error('User not found');
    }

    const photoUrl = await cloudinary.uploader.upload(photo);

    // Create a new property
    const newProperty = await Property.create(
      {
        title,
        description,
        propertyType,
        location,
        price,
        photo: photoUrl.url,
        creator: user._id,
      },
    );

    // Update the user's allProperties field with the new property
    user.allProperties.push(newProperty._id);
    await user.save({ session });

    // Commit the transaction
    await session.commitTransaction();

    // Send response
    res.status(200).json({ message: 'Property created successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create property, please try again later' });
  }
};

const updateProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title, description, propertyType, location, price, photo,
    } = req.body;

    const photoUrl = await cloudinary.uploader.upload(photo);
    await Property.findByIdAndUpdate({ _id: id }, {
      title,
      description,
      propertyType,
      location,
      price,
      photo: photoUrl?.url || photo,
    });
    res.status(200).json({ message: 'Property updated successfully' });


  } catch (error) {
    res.status(500).json({message: error.message});
  }
};

const deleteProperty = async (req, res) => {

  try {
    const { id } = req.params;
   const propertyToDelete = await Property.findById({ _id: id }).populate('creator');

    if (!propertyToDelete) {
      throw new Error('Property not found');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    await Property.deleteOne({ _id: id }).session(session);
    propertyToDelete.creator.allProperties.pull(propertyToDelete);

    await propertyToDelete.creator.save({session});
    await session.commitTransaction();

    res.status(200).json({ message: 'Property deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export {
  getAllProperties,
  getPropertyDetail,
  createProperty,
  updateProperty,
  deleteProperty,
};