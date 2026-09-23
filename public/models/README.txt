This directory holds the pre-trained model weights for the server-side AI handlers.

Run `node scripts/download-models.js` to populate it.

After download, the structure should be:

  public/models/
    face-api/
      tiny_face_detector_model-shard1
      tiny_face_detector_model-weights_manifest.json
      face_landmark_68_model-shard1
      face_landmark_68_model-weights_manifest.json
      face_recognition_model-shard1 … shard12
      face_recognition_model-weights_manifest.json
      ssd_mobilenetv1_model-shard1
      ssd_mobilenetv1_model-shard2
      ssd_mobilenetv1_model-weights_manifest.json
    mobilenet/
      model.json
      group1-shard1of55.bin … group1-shard55of55.bin