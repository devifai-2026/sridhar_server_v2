import {
  MediaConvertClient,
  CreateJobCommand,
  GetJobCommand,
} from "@aws-sdk/client-mediaconvert";
import { getPresignedUrl } from "./uploadTos3Function.js";
import mongoose from "mongoose";

const mediaConvert = new MediaConvertClient({
  region: process.env.AR,
  credentials: {
    accessKeyId: process.env.AAK,
    secretAccessKey: process.env.ASK,
  },
});

// Function to trigger MediaConvert job
export const triggerMediaConvertJob = async (
  inputKey,
  folderName,
  fileName
) => {
  const jobName = `transcode-${Date.now()}-${fileName}`;
  const outputKey = `hls/${folderName}/${fileName.replace(".mp4", "")}/`;

  const params = {
    Role: process.env.MEDIACONVERT_ROLE_ARN,
    Settings: {
      Inputs: [
        {
          FileInput: `s3://${process.env.ABN}/${inputKey}`,
          AudioSelectors: {
            "Audio Selector 1": {
              DefaultSelection: "DEFAULT",
            },
          },
          VideoSelector: {
            ColorSpace: "FOLLOW"  // ADD THIS
          },
          TimecodeSource: "ZEROBASED"
        },
      ],
      OutputGroups: [
        {
          Name: "Apple HLS",
          OutputGroupSettings: {
            Type: "HLS_GROUP_SETTINGS",
            HlsGroupSettings: {
              SegmentLength: 6,
              MinSegmentLength: 0,
              Destination: `s3://${process.env.ABN}/${outputKey}`,
              ManifestDurationFormat: "INTEGER",
              ClientCache: "ENABLED",
              StreamInfResolution: "INCLUDE",
              TimestampDeltaMilliseconds: 0,
              CodecSpecification: "RFC_4281",
              OutputSelection: "MANIFESTS_AND_SEGMENTS",
              ProgramDateTime: "EXCLUDE",
              BaseUrl: outputKey,
            },
          },
          Outputs: [
            // Master Playlist (720p)
            {
              NameModifier: "_master",
              VideoDescription: {
                CodecSettings: {
                  Codec: "H_264",
                  H264Settings: {
                    RateControlMode: "QVBR",
                    QvbrSettings: {
                      QvbrQualityLevel: 7,
                      MaxBitrate: 2500000,
                    },
                    GopSize: 3,
                    GopClosedCadence: 1,
                    GopBReference: "DISABLED",
                    SlowPal: "DISABLED",
                    SpatialAdaptiveQuantization: "ENABLED",
                    TemporalAdaptiveQuantization: "ENABLED",
                    FlickerAdaptiveQuantization: "DISABLED",
                  },
                },
                Height: 720,
                Width: 1280,
                ScalingBehavior: "DEFAULT",
                Sharpness: 50,
                AntiAlias: "ENABLED",
              },
              AudioDescriptions: [
                {
                  AudioSelectorName: "Audio Selector 1",
                  CodecSettings: {
                    Codec: "AAC",
                    AacSettings: {
                      Bitrate: 96000,
                      CodingMode: "CODING_MODE_2_0",
                      SampleRate: 48000,
                    },
                  },
                },
              ],
              ContainerSettings: {
                Container: "M3U8",
              },
            },
            // 720p Variant
            {
              NameModifier: "_720p",
              VideoDescription: {
                CodecSettings: {
                  Codec: "H_264",
                  H264Settings: {
                    RateControlMode: "QVBR",
                    QvbrSettings: {
                      QvbrQualityLevel: 7,
                      MaxBitrate: 2500000,
                    },
                    GopSize: 3,
                    GopClosedCadence: 1,
                    GopBReference: "DISABLED",
                  },
                },
                Height: 720,
                Width: 1280,
                ScalingBehavior: "DEFAULT",
                Sharpness: 50,
              },
              AudioDescriptions: [
                {
                  AudioSelectorName: "Audio Selector 1",
                  CodecSettings: {
                    Codec: "AAC",
                    AacSettings: {
                      Bitrate: 96000,
                      CodingMode: "CODING_MODE_2_0",
                      SampleRate: 48000,
                    },
                  },
                },
              ],
              ContainerSettings: {
                Container: "M3U8",
              },
            },
            // 480p Variant
            {
              NameModifier: "_480p",
              VideoDescription: {
                CodecSettings: {
                  Codec: "H_264",
                  H264Settings: {
                    RateControlMode: "QVBR",
                    QvbrSettings: {
                      QvbrQualityLevel: 7,
                      MaxBitrate: 1000000,
                    },
                    GopSize: 3,
                    GopClosedCadence: 1,
                    GopBReference: "DISABLED",
                  },
                },
                Height: 480,
                Width: 854,
                ScalingBehavior: "DEFAULT",
                Sharpness: 50,
              },
              AudioDescriptions: [
                {
                  AudioSelectorName: "Audio Selector 1",
                  CodecSettings: {
                    Codec: "AAC",
                    AacSettings: {
                      Bitrate: 64000,
                      CodingMode: "CODING_MODE_2_0",
                      SampleRate: 48000,
                    },
                  },
                },
              ],
              ContainerSettings: {
                Container: "M3U8",
              },
            },
            // Audio Only (Separate audio track)
            {
              NameModifier: "_audio",
              AudioDescriptions: [
                {
                  AudioSelectorName: "Audio Selector 1",
                  CodecSettings: {
                    Codec: "AAC",
                    AacSettings: {
                      Bitrate: 64000,
                      CodingMode: "CODING_MODE_2_0",
                      SampleRate: 48000,
                    },
                  },
                },
              ],
              ContainerSettings: {
                Container: "M3U8",
              },
              // ADD THIS to make it audio-only
              StreamAssembly: {
                AudioSelectors: {
                  "Audio Selector 1": {
                    Tracks: [1]
                  }
                }
              }
            },
          ],
        },
      ],
    },
  };

  try {
    const command = new CreateJobCommand(params);
    const job = await mediaConvert.send(command);
    console.log(`🎬 MediaConvert job started: ${job.Job.Id}`);
    return job.Job.Id;
  } catch (error) {
    console.error("❌ MediaConvert job failed to start:", error);
    throw error;
  }
};
// Helper function to generate HLS playlist URL
// In utils/mediaConvert.js - UPDATED getHLSPlaylistUrl
export const getHLSPlaylistUrl = async (hlsManifestPath, originalVideoKey) => {
  try {
    console.log("🔧 Generating HLS URL for path:", hlsManifestPath);
    console.log("📹 Original video key:", originalVideoKey);

    // Extract the original folder structure from the video key
    const originalPath = originalVideoKey.split('/').slice(0, -1).join('/');
    const originalFilename = originalVideoKey.split('/').pop();
    const baseFilename = originalFilename.replace('.mp4', '');
    
    console.log("📁 Original path:", originalPath);
    console.log("📁 Base filename:", baseFilename);

    // Build the correct HLS path using the ORIGINAL folder structure (with spaces)
    const correctHlsFolder = `hls/${originalPath}/${baseFilename}/`;
    
    console.log("🎯 Correct HLS folder:", correctHlsFolder);

    // Try different possible playlist names
    const possiblePlaylists = [
      // Master playlist with "_master" suffix
      `${correctHlsFolder}${baseFilename}_master.m3u8`,
      // Original filename (fallback)
      `${correctHlsFolder}${baseFilename}.m3u8`,
      // Variant playlists
      `${correctHlsFolder}${baseFilename}_720p.m3u8`,
      `${correctHlsFolder}${baseFilename}_480p.m3u8`,
      `${correctHlsFolder}${baseFilename}_audio.m3u8`,
      // Generic names
      `${correctHlsFolder}playlist.m3u8`,
      `${correctHlsFolder}index.m3u8`,
    ];

    console.log("🔄 Trying possible playlist names:");

    for (const playlistKey of possiblePlaylists) {
      try {
        console.log(`  Testing: ${playlistKey}`);
        const url = await getPresignedUrl(playlistKey, 86400);
        console.log(`✅ SUCCESS: Found HLS playlist: ${playlistKey}`);
        return url;
      } catch (error) {
        console.log(`  ❌ Not found: ${playlistKey}`);
        // Log the exact error for debugging
        if (error.message.includes('NoSuchKey')) {
          console.log(`    🔍 S3 Key not found: ${playlistKey}`);
        }
        continue;
      }
    }

    // If we reach here, try URL encoding the spaces
    console.log("🔄 Trying URL encoded paths...");
    const urlEncodedPlaylists = possiblePlaylists.map(key => 
      key.replace(/ /g, '%20')
    );

    for (const playlistKey of urlEncodedPlaylists) {
      try {
        console.log(`  Testing URL encoded: ${playlistKey}`);
        const url = await getPresignedUrl(playlistKey, 86400);
        console.log(`✅ SUCCESS: Found HLS playlist (URL encoded): ${playlistKey}`);
        return url;
      } catch (error) {
        console.log(`  ❌ Not found (URL encoded): ${playlistKey}`);
        continue;
      }
    }

    throw new Error("No HLS playlist found in any expected location");
  } catch (error) {
    console.error("❌ Error generating HLS URL:", error);
    throw error;
  }
};
// Function to check MediaConvert job status
// Function to check MediaConvert job status
export const checkMediaConvertJobStatus = async (jobId, topicId) => {
  try {
    const command = new GetJobCommand({ Id: jobId });
    const response = await mediaConvert.send(command);

    const status = response.Job.Status;
    console.log(`📊 MediaConvert job ${jobId} status: ${status}`);

    // Update topic based on job status
    let updateData = {};

    switch (status) {
      case "COMPLETE":
        const outputGroup = response.Job.Settings.OutputGroups[0];
        const outputPath = outputGroup.OutputGroupSettings.HlsGroupSettings.Destination;

        // Extract the HLS manifest path
        const hlsManifestPath = outputPath.replace(`s3://${process.env.ABN}/`, "");

        // Get the original video key from the topic
        const Topic = mongoose.model('Topic');
        const topic = await Topic.findById(topicId);
        const originalVideoKey = topic.videoUrl;

        // Generate pre-signed URL for HLS playlist WITH original video key
        const hlsUrl = await getHLSPlaylistUrl(hlsManifestPath, originalVideoKey);

        updateData = {
          transcodingStatus: "COMPLETED",
          hlsUrl: hlsUrl,
        };
        console.log(`✅ Transcoding completed. HLS URL generated`);
        break;

      case "PROGRESSING":
        updateData = { transcodingStatus: "PROCESSING" };
        break;

      case "ERROR":
        updateData = { transcodingStatus: "FAILED" };
        console.error(`❌ MediaConvert job failed: ${response.Job.ErrorMessage}`);
        break;

      default:
        updateData = { transcodingStatus: "PROCESSING" };
    }

    await mongoose.model("Topic").findByIdAndUpdate(topicId, updateData);
    return status;
  } catch (error) {
    console.error(`❌ Error checking MediaConvert job ${jobId}:`, error);

    // Update topic status to failed
    await mongoose.model("Topic").findByIdAndUpdate(topicId, {
      transcodingStatus: "FAILED",
    });

    throw error;
  }
};